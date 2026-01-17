import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyzing Your Listing - AirbnbOptimizer',
  description: 'We are analyzing your Airbnb listing to provide personalized optimization recommendations.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/',
  },
};

export default function WaitingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
