interface WelcomeHeaderProps {
  username?: string;
}

export default function WelcomeHeader({ username }: WelcomeHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
        Welcome back, {username}!
      </h1>
      <p className="text-neutral-600">
        Stay connected with your team through real-time messaging
      </p>
    </div>
  );
}