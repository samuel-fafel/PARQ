interface key_value_store {
  [key: string]: any;
}

const store: key_value_store = {};
let trains_arriving_per_timeslot: Map<number, number> = new Map();

export const database = {
  set: (key: string, value: any): void => {
    store[key] = value;
    if (Array.isArray(value)) {
      // If the value is an array, assume it's a schedule and update trains_arriving_per_timeslot
      value.forEach(time => {
        const [hours, minutes, period] = time.split(/[: ]/);
        let minutesOfDay = ((parseInt(hours) % 12) * 60) + parseInt(minutes) + (period === 'AM' ? 0 : 720);
        trains_arriving_per_timeslot.set(minutesOfDay, (trains_arriving_per_timeslot.get(minutesOfDay) || 0) + 1);
      });
    }
  },
  fetch: (key: string): any => {
    return store[key];
  },
  keys: (): string[] => {
    return Object.keys(store);
  },
  map: (): Map<number, number> => {
    return trains_arriving_per_timeslot;
  }
};
  