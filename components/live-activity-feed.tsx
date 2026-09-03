import { getRecentActivity } from "@/lib/social-proof";
import { LiveActivity } from "@/components/live-activity";

/**
 * Server half of the storefront activity pop-up: loads real events and hands
 * them to the client component. Renders nothing at all when there's no
 * genuine activity to show, rather than inventing some.
 */
export async function LiveActivityFeed() {
  const events = await getRecentActivity();
  if (events.length === 0) return null;
  return <LiveActivity events={events} />;
}
