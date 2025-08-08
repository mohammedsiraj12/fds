import React, { useEffect, useState } from "react";
import {
  getAllConsultations,
  getPatientProfile,
  getDoctorProfile,
} from "../../lib/database";

export default function AdminDashboard() {
  const [consultations, setConsultations] = useState([]);
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: cons } = await getAllConsultations();
      setConsultations(cons || []);
      const { data: pats } = await getAllPatients();
      setUsers(pats || []);
      const { data: docs } = await getAllDoctors();
      setDoctors(docs || []);
    }
    fetchData();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <h2>Consultations</h2>
      <table border="1" cellPadding="4">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.patient_id}</td>
              <td>{c.doctor_id || "Unassigned"}</td>
              <td>{c.status}</td>
              <td>{c.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Patients</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.full_name} ({u.gender})
          </li>
        ))}
      </ul>
      <h2>Doctors</h2>
      <ul>
        {doctors.map((d) => (
          <li key={d.id}>
            {d.full_name} ({d.specialization})
          </li>
        ))}
      </ul>
    </div>
  );
}
