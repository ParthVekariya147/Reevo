import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import TrustSection from "@/components/home/TrustSection";
import SupportedPlatforms from "@/components/home/SupportedPlatforms";
import HowItWorks from "@/components/home/HowItWorks";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import AnalyticsShowcase from "@/components/home/AnalyticsShowcase";
import IndustriesStrip from "@/components/home/IndustriesStrip";
import MobileExperience from "@/components/home/MobileExperience";
import PricingPreview from "@/components/home/PricingPreview";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import HomeFAQ from "@/components/home/HomeFAQ";
import CTASection from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main style={{ flexGrow: 1 }}>
        <HeroSection />
        <TrustSection />
        <SupportedPlatforms />
        <HowItWorks />
        <FeaturesGrid />
        <AnalyticsShowcase />
        <IndustriesStrip />
        <MobileExperience />
        <PricingPreview />
        <TestimonialsSection />
        <HomeFAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
