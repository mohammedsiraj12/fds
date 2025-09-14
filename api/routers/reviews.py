from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

from auth.utils import get_current_user
from database.connection import driver

router = APIRouter(prefix="/reviews", tags=["reviews"])

class ReviewCreate(BaseModel):
    doctor_id: str
    consultation_id: Optional[str] = None
    appointment_id: Optional[str] = None
    rating: int  # 1-5 stars
    title: str
    comment: str
    recommend: bool = True

class ReviewResponse(BaseModel):
    response: str

@router.post("/create")
def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a doctor (patients only)"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create reviews")
    
    # Validate rating
    if not 1 <= review_data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    try:
        with driver.session() as session:
            # Check if doctor exists
            doctor_check = session.run(
                "MATCH (d:Doctor {user_id: $doctor_id}) RETURN d",
                doctor_id=review_data.doctor_id
            )
            
            if not doctor_check.single():
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            # Check if patient has had consultation/appointment with this doctor
            if review_data.consultation_id:
                interaction_check = session.run(
                    """
                    MATCH (c:Consultation {id: $consultation_id, patient_id: $patient_id})
                    MATCH (d:Doctor {user_id: $doctor_id})-[:RESPONDED_TO]->(c)
                    RETURN c
                    """,
                    consultation_id=review_data.consultation_id,
                    patient_id=current_user["id"],
                    doctor_id=review_data.doctor_id
                )
            elif review_data.appointment_id:
                interaction_check = session.run(
                    """
                    MATCH (a:Appointment {id: $appointment_id, patient_id: $patient_id, doctor_id: $doctor_id})
                    WHERE a.status = 'completed'
                    RETURN a
                    """,
                    appointment_id=review_data.appointment_id,
                    patient_id=current_user["id"],
                    doctor_id=review_data.doctor_id
                )
            else:
                # General review - check if patient has any interaction with doctor
                interaction_check = session.run(
                    """
                    MATCH (d:Doctor {user_id: $doctor_id})
                    WHERE (d)-[:RESPONDED_TO]->(:Consultation {patient_id: $patient_id})
                       OR (:Appointment {patient_id: $patient_id, doctor_id: $doctor_id, status: 'completed'})
                    RETURN d
                    """,
                    doctor_id=review_data.doctor_id,
                    patient_id=current_user["id"]
                )
            
            if not interaction_check.single():
                raise HTTPException(status_code=400, detail="You can only review doctors you have consulted with")
            
            # Check for existing review
            existing_review = session.run(
                """
                MATCH (r:Review {patient_id: $patient_id, doctor_id: $doctor_id})
                WHERE ($consultation_id IS NULL OR r.consultation_id = $consultation_id)
                  AND ($appointment_id IS NULL OR r.appointment_id = $appointment_id)
                RETURN r
                """,
                patient_id=current_user["id"],
                doctor_id=review_data.doctor_id,
                consultation_id=review_data.consultation_id,
                appointment_id=review_data.appointment_id
            )
            
            if existing_review.single():
                raise HTTPException(status_code=400, detail="You have already reviewed this interaction")
            
            # Create review
            review_id = str(uuid.uuid4())
            result = session.run(
                """
                CREATE (r:Review {
                    id: $review_id,
                    patient_id: $patient_id,
                    doctor_id: $doctor_id,
                    consultation_id: $consultation_id,
                    appointment_id: $appointment_id,
                    rating: $rating,
                    title: $title,
                    comment: $comment,
                    recommend: $recommend,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                
                // Update doctor's rating
                WITH r
                MATCH (d:Doctor {user_id: $doctor_id})
                OPTIONAL MATCH (d)<-[:REVIEWED]-(existing:Review)
                WITH d, r, count(existing) as existing_reviews, avg(existing.rating) as current_avg
                
                SET d.total_reviews = existing_reviews + 1,
                    d.rating = CASE 
                        WHEN existing_reviews = 0 THEN toFloat($rating)
                        ELSE (current_avg * existing_reviews + $rating) / (existing_reviews + 1)
                    END,
                    d.updated_at = datetime()
                
                CREATE (d)<-[:REVIEWED]-(r)
                RETURN r, d
                """,
                review_id=review_id,
                patient_id=current_user["id"],
                doctor_id=review_data.doctor_id,
                consultation_id=review_data.consultation_id,
                appointment_id=review_data.appointment_id,
                rating=review_data.rating,
                title=review_data.title,
                comment=review_data.comment,
                recommend=review_data.recommend
            )
            
            review_record = result.single()
            if review_record:
                review_dict = dict(review_record["r"])
                review_dict['created_at'] = str(review_dict['created_at'])
                review_dict['updated_at'] = str(review_dict['updated_at'])
                
                return {
                    "success": True,
                    "message": "Review submitted successfully",
                    "review": review_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to create review")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor/{doctor_id}")
def get_doctor_reviews(
    doctor_id: str,
    limit: int = Query(20, le=100),
    rating_filter: Optional[int] = Query(None)
):
    """Get reviews for a doctor"""
    try:
        with driver.session() as session:
            query = """
            MATCH (d:Doctor {user_id: $doctor_id})<-[:REVIEWED]-(r:Review)
            OPTIONAL MATCH (p:Patient {user_id: r.patient_id})
            OPTIONAL MATCH (pu:User {id: r.patient_id})
            """
            
            params = {"doctor_id": doctor_id, "limit": limit}
            
            if rating_filter:
                query += " WHERE r.rating = $rating_filter"
                params["rating_filter"] = rating_filter
            
            query += """
            RETURN r, p, pu.email as patient_email
            ORDER BY r.created_at DESC
            LIMIT $limit
            """
            
            result = session.run(query, params)
            
            reviews = []
            for record in result:
                review = dict(record["r"])
                patient = dict(record["p"]) if record["p"] else {}
                
                # Convert datetime and anonymize patient info
                review['created_at'] = str(review['created_at'])
                review['updated_at'] = str(review['updated_at'])
                
                # Anonymize patient information
                patient_info = {
                    "name": patient.get("full_name", "Anonymous")[:1] + "***" if patient.get("full_name") else "Anonymous",
                    "verified": bool(patient)
                }
                
                reviews.append({
                    "review": review,
                    "patient": patient_info
                })
            
            # Get summary statistics
            summary_result = session.run(
                """
                MATCH (d:Doctor {user_id: $doctor_id})
                RETURN d.rating as avg_rating, d.total_reviews as total_reviews
                """,
                doctor_id=doctor_id
            )
            
            summary = summary_result.single()
            
            return {
                "reviews": reviews,
                "summary": {
                    "average_rating": round(summary["avg_rating"], 2) if summary and summary["avg_rating"] else 0.0,
                    "total_reviews": summary["total_reviews"] if summary else 0
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{review_id}/respond")
def respond_to_review(
    review_id: str,
    response_data: ReviewResponse,
    current_user: dict = Depends(get_current_user)
):
    """Doctor responds to a review"""
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can respond to reviews")
    
    try:
        with driver.session() as session:
            # Check if review exists and is for this doctor
            review_check = session.run(
                """
                MATCH (r:Review {id: $review_id, doctor_id: $doctor_id})
                RETURN r
                """,
                review_id=review_id,
                doctor_id=current_user["id"]
            )
            
            if not review_check.single():
                raise HTTPException(status_code=404, detail="Review not found or access denied")
            
            # Add response
            result = session.run(
                """
                MATCH (r:Review {id: $review_id})
                SET r.doctor_response = $response,
                    r.response_date = datetime(),
                    r.updated_at = datetime()
                RETURN r
                """,
                review_id=review_id,
                response=response_data.response
            )
            
            updated_review = result.single()
            if updated_review:
                review_dict = dict(updated_review["r"])
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'response_date']:
                    if field in review_dict and review_dict[field]:
                        review_dict[field] = str(review_dict[field])
                
                return {
                    "success": True,
                    "message": "Response added successfully",
                    "review": review_dict
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to add response")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-reviews")
def get_my_reviews(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, le=100)
):
    """Get reviews written by current user"""
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can view their reviews")
    
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (r:Review {patient_id: $patient_id})
                OPTIONAL MATCH (d:Doctor {user_id: r.doctor_id})
                OPTIONAL MATCH (du:User {id: r.doctor_id})
                RETURN r, d, du
                ORDER BY r.created_at DESC
                LIMIT $limit
                """,
                patient_id=current_user["id"],
                limit=limit
            )
            
            reviews = []
            for record in result:
                review = dict(record["r"])
                doctor = dict(record["d"]) if record["d"] else {}
                doctor_user = dict(record["du"]) if record["du"] else {}
                
                # Convert datetime fields
                for field in ['created_at', 'updated_at', 'response_date']:
                    if field in review and review[field]:
                        review[field] = str(review[field])
                
                if 'password' in doctor_user:
                    del doctor_user['password']
                
                reviews.append({
                    "review": review,
                    "doctor": doctor,
                    "doctor_user": doctor_user
                })
            
            return {"reviews": reviews}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
