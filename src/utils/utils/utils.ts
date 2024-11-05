import { Interval } from '../../types/api';

export function adjustIntervals(intervals: Interval[], start: number, end: number, separator: number): Interval[] {
    if (intervals.length <= 1) {
        return intervals;
    }

    // Sort intervals by their start position
    intervals.sort((a, b) => a[0] - b[0]);

    const totalIntervals = intervals.length;
    const totalSpace = end - start;
    const totalIntervalWidth = intervals.reduce((acc, interval) => acc + ((interval[1] - interval[0]) + separator), 0); // separator is added here to account for the space between intervals
    const emptyScaleFactor = (totalSpace - totalIntervalWidth) / totalSpace; // total fraction of space that is not occupied by intervals

    // compute intervals between interval median points
    let negativeIntervals = [[0,0]];
    for (let i = 0; i < totalIntervals; i++) {
        const midpoint = computeMidpoint(intervals[i][0], intervals[i][1]);
        negativeIntervals[negativeIntervals.length - 1][1] = midpoint;
        negativeIntervals.push([midpoint,end]);
    }

    // compute scaled width of spacers
    let scaledSpacerWidths = [];
    for (let i = 0; i < negativeIntervals.length; i++) {
        const interval = negativeIntervals[i];
        const intervalWidth = (interval[1] - interval[0])-separator;
        const scaledWidth = intervalWidth * emptyScaleFactor;
        scaledSpacerWidths.push(scaledWidth);
    }

    // compute positions of original intervals separated by scaled spacers
    let new_intervals: Interval[] = [];
    let prev_end = start;
    for (let i = 0; i < totalIntervals; i++) {
        const interval = intervals[i];
        const intervalWidth = (interval[1] - interval[0]);
        const spacer = scaledSpacerWidths[i]+separator;
        const new_interval: Interval = [prev_end+spacer, prev_end + spacer + intervalWidth];
        prev_end = new_interval[1];
        new_intervals.push(new_interval);
    }
    
    return new_intervals;
}


export function computeMidpoint(a: number, b: number): number {
    // Ensure a is less than b
    if (a > b) {
        [a, b] = [b, a];
    }

    // Calculate the midpoint
    const midpoint = (a + b) / 2;

    return midpoint;
}