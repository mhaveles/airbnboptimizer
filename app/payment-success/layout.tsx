import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Successful - AirbnbOptimizer',
  description: 'Your payment was successful. Your premium Airbnb description is being generated.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/',
  },
};

export default function PaymentSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
