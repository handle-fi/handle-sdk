export const isTradeWeekend = () => {
  // convert current date to est (Eastern Time)
  const estDateString = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York" // EST time
  });
  // get current date as est
  const estDate = new Date(estDateString);
  // note these start at zero, where zero is sunday
  const day = estDate.getDay();
  const hour = estDate.getHours();
  // trades are closed between 4PM EST on friday until 5 PM EST on sunday
  if (day === 5 && hour >= 16) {
    // Friday, from 4pm
    return true;
  }

  if (day === 0 && hour < 17) {
    // Sunday, before 5pm
    return true;
  }

  // if the day is saturday, then it is the trade weekend,
  // otherwise, it must be in the trade week
  return day === 6;
};
