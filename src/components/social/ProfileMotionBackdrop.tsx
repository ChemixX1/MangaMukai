export interface ProfileBackdropCover {
  id: string | number;
  title: string;
  cover: string;
}

interface ProfileMotionBackdropProps {
  covers: ProfileBackdropCover[];
  isLight: boolean;
}

const buildRow = (covers: ProfileBackdropCover[], rowIndex: number) => {
  if (covers.length === 0) return [];
  const rowLength = Math.max(12, covers.length * 2);
  return Array.from({ length: rowLength }, (_, index) => covers[(index + rowIndex * 3) % covers.length]);
};

export const ProfileMotionBackdrop = ({ covers, isLight }: ProfileMotionBackdropProps) => {
  const rows = Array.from({ length: 4 }, (_, rowIndex) => buildRow(covers, rowIndex));

  return (
    <div className={`profile-cover-backdrop ${isLight ? 'profile-cover-backdrop-light' : 'profile-cover-backdrop-dark'}`} aria-hidden="true">
      {covers.length > 0 && (
        <div className="profile-cover-field">
          {rows.map((row, rowIndex) => (
            <div key={`profile-cover-row-${rowIndex}`} className="profile-cover-row">
              <div className={`profile-cover-track ${rowIndex % 2 === 0 ? 'profile-cover-track-forward' : 'profile-cover-track-reverse'}`} style={{ animationDuration: `${58 + rowIndex * 9}s` }}>
                {[0, 1].map((sequenceIndex) => (
                  <div key={`profile-cover-sequence-${rowIndex}-${sequenceIndex}`} className="profile-cover-sequence">
                    {row.map((cover, coverIndex) => (
                      <figure key={`${rowIndex}-${sequenceIndex}-${cover.id}-${coverIndex}`} className="profile-cover-card">
                        <img src={cover.cover} alt="" loading="eager" decoding="async" />
                      </figure>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="profile-cover-glow" />
      <div className="profile-cover-veil" />
    </div>
  );
};
