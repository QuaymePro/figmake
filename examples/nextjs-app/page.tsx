import { Button } from '@/components/Button';
import { Hero } from '@/components/Hero';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Hero 
        headline="Figma to Code, Instantly"
        subheadline="Stop manual handoffs. Export production-ready React components in seconds."
      />
      
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <Button text="Deploy Now" />
      </div>
    </main>
  );
}
