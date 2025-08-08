import React from "react";

export default function DoctorName({ consultation }) {
  // consultation.doctor_profiles?.full_name is available from your getPatientConsultations
  const doctorName = consultation?.doctor_profiles?.full_name || "Not assigned";
  return (
    <span style={{ fontWeight: "bold", color: "#2a7" }}>
      {doctorName}
    </span>
  );
}
