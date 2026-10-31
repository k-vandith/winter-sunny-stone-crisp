import { createFileRoute } from "@tanstack/react-router";
import { ShieldApp } from "@/components/shield/shield-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ShieldApp />;
}
