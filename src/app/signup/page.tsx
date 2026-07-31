import Link from "next/link";
import Card from "@/components/ui/Card";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-bold text-center">
        Join <span className="text-gradient-rage">Ragebait</span>
      </h1>
      <p className="mt-2 text-center text-sm text-white/50">
        Your Aura starts at zero. Make it count.
      </p>

      <Card className="mt-8">
        <SignupForm />
      </Card>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="text-aura-purple hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
