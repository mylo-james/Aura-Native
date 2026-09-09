import {Moon} from './Moon';
export function AnimatedMoon({
  mood,
  size = 116,
}: {
  mood: number;
  size?: number;
}) {
  return (
    <div className="aura-character" key={mood} data-mood={mood}>
      <Moon mood={mood} size={size} />
    </div>
  );
}
