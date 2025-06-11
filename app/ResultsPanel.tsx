import React from "react";
import { BackgroundCheckResult } from "@/types";
import { Download, FileText } from "./_components/ui/icons";
import { generateBackgroundCheckPDF } from "./actions";

interface ResultsPanelProps {
  results: BackgroundCheckResult | null;
  isLoading: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, isLoading }) => {
  const handleDownloadPDF = () => {
    if (results) {
      generateBackgroundCheckPDF(results, true);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  console.log({ results });
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <div className="animate-pulse w-full max-w-md">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded mb-6 w-1/2"></div>

          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-4"></div>

          <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
        </div>
        <p className="mt-4 text-gray-600">
          Generating AI background check results...
        </p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />

        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Results Yet
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          Submit prospect information on the left to generate a comprehensive
          background check report.
        </p>
      </div>
    );
  }
  const showDownloadButton =
    results.businessAssociations.found ||
    results.legalAppearances.found ||
    results.newsArticles.found ||
    results.onlineActivity.found ||
    results.socialMedia.found;

  return (
    <div className="!max-h-[370px] md:!max-h-[490px] md:overflow-auto">
      <div className="flex flex-col md:flex-row gap-4 md:justify-between items-center mb-6 ">
        <div className="hidden md:flex">
          <h2 className="md:text-xl font-semibold text-gray-800 ">
            Background Check Results
          </h2>
        </div>
        {showDownloadButton && (
          <button
            onClick={handleDownloadPDF}
            className="text-md md:text-lg w-fit cursor-pointer flex items-center text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">
            {results.prospect.firstName} {results.prospect.lastName}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(
              results.riskLevel
            )}`}
          >
            {results.riskLevel.charAt(0).toUpperCase() +
              results.riskLevel.slice(1)}{" "}
            Risk
          </span>
        </div>
        <p className="text-gray-600 text-sm">
          {results.prospect.city}, {results.prospect.state},{" "}
        </p>

        <p className="text-gray-600 text-sm">
          Report ID: {results.id} • Generated on{" "}
          {new Date(results.timestamp).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-4">
        {/* Legal Appearances */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Legal Appearances</h4>
          </div>
          <div className="p-4">
            {results.legalAppearances.found ? (
              <div>
                {results.legalAppearances.cases.map((case_, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{case_.type}</span>
                      <span className="text-sm text-gray-600">
                        {case_.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {case_.court} • Case #{case_.caseNumber}
                    </p>
                    <p className="text-sm text-gray-600">Filed: {case_.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No legal appearances found in BC courts.
              </p>
            )}
            <p className="text-sm font-medium mt-3">
              {results.legalAppearances.recommendation}
            </p>
          </div>
        </div>
        {/* News Articles */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">News Articles</h4>
          </div>
          <div className="p-4">
            {results.newsArticles.found ? (
              <div>
                {results.newsArticles.articles.map((article, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <h5 className="font-medium">{article.title}</h5>
                    <p className="text-sm text-gray-600">
                      {article.source} • {article.date}
                    </p>
                    <p className="text-sm mt-1">{article.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No significant news articles found.
              </p>
            )}
          </div>
        </div>
        {/* Social Media */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Online/Social Media Presence</h4>
          </div>
          <div className="p-4">
            {results.socialMedia.found ? (
              <div>
                {results.socialMedia.profiles.map((profile, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <h5 className="font-medium">{profile.platform}</h5>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Profile
                    </a>
                    <p className="text-sm mt-1">{profile.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">
                No significant social media presence found.
              </p>
            )}
            <p className="text-sm font-medium mt-3">
              {results.socialMedia.recommendation}
            </p>
          </div>
        </div>

        {/* Business Associations */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Business Associations</h4>
          </div>
          <div className="p-4">
            {results.businessAssociations.found ? (
              <div>
                {results.businessAssociations.companies.map(
                  (company, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                      <h5 className="font-medium">{company.name}</h5>
                      <p className="text-sm text-gray-600">
                        {company.role} • {company.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Registered: {company.registrationDate}
                      </p>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-600">No business associations found.</p>
            )}
            <p className="text-sm font-medium mt-3">
              {results.businessAssociations.recommendation}
            </p>
          </div>
        </div>

        {/* Online Activity */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium">Online Activity</h4>
          </div>
          <div className="p-4">
            <p className="text-gray-600 mb-3">
              {results.onlineActivity.details}
            </p>
            <p className="text-sm font-medium">
              {results.onlineActivity.recommendation}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="font-medium mb-2">Overall Recommendation</h4>
        <p className="text-gray-800">{results.overallRecommendation}</p>
      </div>
    </div>
  );
};

export default ResultsPanel;
