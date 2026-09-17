import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-8 font-bold hover:underline"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        <div className="border-2 border-black bg-white shadow-[6px_6px_0px_#000] p-8 md:p-12">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-8">Privacy Policy</h1>
          
          <div className="prose prose-stone max-w-none prose-headings:font-black prose-headings:uppercase">
            <p className="font-bold text-lg mb-8">
              Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h3>1. Introduction</h3>
            <p>
              Welcome to Studenius! We are currently in our Beta testing phase. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.
            </p>

            <h3>2. Information We Collect</h3>
            <p>
              <strong>Account Information:</strong> When you sign up, we collect your email address, name, and profile details necessary to create your account via Supabase authentication.
            </p>
            <p>
              <strong>Study Data:</strong> We collect and store your study materials, flashcards, generated notes, and activity history to provide our core educational features. This data is stored securely.
            </p>
            <p>
              <strong>Usage Information:</strong> We may collect basic diagnostic and usage data to help us identify bugs and improve the Beta platform.
            </p>

            <h3>3. How We Use Your Data</h3>
            <p>
              Your data is strictly used to provide, maintain, and improve the Studenius platform. We use AI models (e.g., via Groq API) to generate educational content based on the study materials you provide. 
            </p>

            <h3>4. Data Sharing and Disclosure</h3>
            <p>
              We do not sell, rent, or trade your personal information. We only share data with trusted third-party service providers (like our database host, Supabase, and our AI provider, Groq) strictly for the purpose of operating the application.
            </p>

            <h3>5. Data Security</h3>
            <p>
              We use standard security measures including Row Level Security (RLS) in our database to ensure that your study data is only accessible by you. However, as this is a Beta product, we recommend not uploading sensitive personal information.
            </p>

            <h3>6. Your Rights</h3>
            <p>
              You have the right to access, modify, or delete your account and associated data at any time. If you wish to delete your data completely, please contact us or use the account deletion features in the app.
            </p>

            <h3>7. Changes to this Policy</h3>
            <p>
              We may update this policy as we transition out of Beta and add new features. We will notify you of any significant changes.
            </p>

            <h3>8. Contact Us</h3>
            <p>
              If you have any questions or feedback regarding this Privacy Policy or your data, please contact the development team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
