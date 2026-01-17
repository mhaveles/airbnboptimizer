import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Recommendations - AirbnbOptimizer',
  description: 'Your personalized Airbnb listing optimization recommendations.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/',
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
