import { StatusWindow } from '../features/dashboard/StatusWindow';
import { TodayQuests } from '../features/quests/TodayQuests';

// Status window on the side (sticky on large screens), quests in the main column.
// On phones, everything stacks: status window first.
export function DashboardPage() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
      <div className="lg:sticky lg:top-6">
        <StatusWindow />
      </div>
      <TodayQuests />
    </div>
  );
}
