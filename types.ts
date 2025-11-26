export interface ProspectInfo {
  firstName: string;
  lastName: string;
  other_names?: string;
  email: string;
  phone: string;
  street_address: string;
  location?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  city2: string | undefined;
  state2: string | undefined;
  dob: string;
  lengthOfStay: "yes" | "no";
  company: string;
  school: string;
  social_media_profile: string;
}
interface OtherOnlineActivty {
  note: string;
  link: string;
  platform: string;
}

interface OnlinePublicComments {
  date: string;
  platform: string;
  content: string;
  link: string;
}
export interface BackgroundCheckResult {
  id: string;
  timestamp: string;
  prospect: ProspectInfo;
  newsArticles: {
    found: boolean;
    articles: Array<{
      title: string;
      date: string;
      source: string;
      summary: string;
    }>;
  };
  legalAppearances: {
    found: boolean;
    cases: Array<{
      caseNumber: string;
      date: string;
      court: string;
      type: string;
      status: string;
    }>;
    recommendation: string;
  };
  socialMedia: {
    found: boolean;
    profiles: Array<{
      platform: string;
      url: string;
      summary: string;
    }>;
    recommendation: string;
  };
  businessAssociations: {
    found: boolean;
    companies: Array<{
      name: string;
      role: string;
      status: string;
      registrationDate: string;
    }>;
    recommendation: string;
  };
  onlineActivity: {
    found: boolean;
    details: {
      others: Array<OtherOnlineActivty>;
      public_comments: Array<OnlinePublicComments>;
    };
    fallback: string;
    recommendation: string;
  };
  riskLevel: "low" | "medium" | "high";
  overallRecommendation: string;
}
