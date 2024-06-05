import express from 'express';
import {database} from './database'

const app = express();
const port = 3000;
app.use(express.json());

// Custom functions for determining valid inputs
const isValidLineName = (line_name: any): boolean => {
    if (typeof line_name != 'string') {return false}
    const line_regex = /^[a-zA-Z0-9]{1,4}$/
    return line_regex.test(line_name)
};

const isValidTimeFormat = (time: any): boolean => {
    if (typeof time != 'string') {return false}
    const time_regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] [AP]M$/
    return time_regex.test(time);
};

/**
 * Post a schedule for a new train line.
 * Arguments:
 *      The name of the train line (string of up to 4 alphanumeric characters)
 *      List of arrival times for the new train. (Time format HH:MM A/PM)
 * Actions:
 *      Checks validity of input
 *      Sets valid input into the database
 * Returns:
 *      Valid/Invalid Status 
 */
app.post('/schedule-new-line', (req, res) => {
    const {line_name, arrival_times} = req.body;

    // Check if line_name is valid and arrival_times is a list
    if (!isValidLineName(line_name) || !Array.isArray(arrival_times)) {
        return res.status(400).send("Invalid Post Format")
    }

    // Check each time in the arrival_times array for validity
    for (const time of arrival_times) {
        if (!isValidTimeFormat(time)) {
            return res.status(400).send('Invalid Time Format');
        }
    }

    // If previous checks passed, request is valid, set in database and return
    database.set(line_name, arrival_times);
    return res.status(200).send("Schedule Added");
});

/**
 * Get the next time multiple trains will ariivate at the station at the same minute.
 * Arguments:
 *      Time value (Time format HH:MM A/PM)
 * Actions:
 *      Checks validity of input
 *      Checks for available schedules
 *      Converts input time to minutes
 *      Finds next simultaneous arrival time if it exists
 * Returns:
 *      Valid/Invalid Status 
 *      or the next timestamp two or more trains will arrive simultaneously (after the inputted time)
 */
app.get('/next-simultaneous-arrival', (req, res) => {
    const {current_time} = req.query;

    // Check validity of input time
    if (!isValidTimeFormat(current_time)) {
        return res.status(400).send("Invalid Time Format");
    }
    
    // Check for available schedules
    const keys = database.keys();
    if (keys.length === 0) {
        return res.status(404).send('No Schedules Available');
    }
    
    // Convert input time to minutes
    // This is an easy way to determine if a simultaneous arrival is after the inputted time
    const [hours, minutes, period] = (current_time as string).split(/[: ]/);
    let current_time_minutes = ((parseInt(hours) % 12) * 60) + parseInt(minutes) + (period === 'AM' ? 0 : 720); // Noon = 720 minutes from midnight

    /**
     * Current Solution:
     *      Use a stored Map {time: train count} for each timeslot available and count how many trains arrive at each time. 
     *      Any time with trains >= 2 is valid.
     *      Returns the first timestamp which has train count >= 2
     * Alternate Solutions:
     *      Nested for loop to compare each train's schedule with the others', find a matching timeslot > input
     *      or GPT recommends using ".reduce()" to flatten the array of times into a single array, but I'm unfamiliar with this method
     */
    const findNextSimultaneousArrival = (start_minutes: number): string | null => {
        const minutes_schedule = database.map();
        for (const [time, train_count] of minutes_schedule) {
            if (time > start_minutes && train_count >= 2) {
                const h = Math.floor(time / 60) % 12 || 12;
                const m = time % 60;
                const p = time >= 720 ? 'PM' : 'AM';
                return `${h}:${m.toString().padStart(2, '0')} ${p}`;
            }
        }
        return null;
    };
  
    // Find next arrival time today or tomorrow
    let nextArrival = findNextSimultaneousArrival(current_time_minutes);
    if (!nextArrival) { // Try tomorrow
      nextArrival = findNextSimultaneousArrival(0);
    }
  
    if (!nextArrival) { // None found
      return res.status(404).send('No Simultaneous Arrivals');
    }
  
    return res.status(200).send(nextArrival);
  });

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
