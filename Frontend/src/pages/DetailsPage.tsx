import React from "react";
import { useNavigate } from "react-router-dom";
import { CandidateDetailsForm } from "../components/onboarding/CandidateDetailsForm";

export const DetailsPage: React.FC = () => {
  const navigate = useNavigate();

  return <CandidateDetailsForm onCompleted={() => navigate("/dashboard")} />;
};
