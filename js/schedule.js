// When each box gets used, laid out as a calendar of days × meals.
// A box is used when its feed is put to soak, a fixed time before the meal. After a refill the boxes
// cover the following meals in order, starting with the first meal whose soaking is still ahead.
// Without a refill the calendar starts today and every box counts as empty.
// Same rules as FeedingSchedule.cs in the Unity project.

const Schedule = (() => {
  const MINUTE = 60 * 1000;

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(day, days) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);
  }

  /** The given day at the given minutes after midnight, in local (wall clock) time. */
  function at(day, minutes) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
  }

  class FeedingSchedule {
    /**
     * @param {number[]} mealMinutes meal times as minutes after midnight, one per daily meal
     * @param {number} soakMinutes how long before the meal its box is used
     * @param {number} boxCount
     * @param {Date|null} refilledAt
     * @param {Date} today
     */
    constructor(mealMinutes, soakMinutes, boxCount, refilledAt, today) {
      this.mealMinutes = [...mealMinutes].sort((a, b) => a - b);
      this.soak = soakMinutes * MINUTE;
      this.boxCount = boxCount;
      this.refilledAt = refilledAt;

      if (refilledAt) {
        let firstDay = startOfDay(refilledAt);
        let meal = 0;
        while (meal < this.mealsPerDay && at(firstDay, this.mealMinutes[meal]) - this.soak <= refilledAt)
          meal++;
        if (meal === this.mealsPerDay) {
          firstDay = addDays(firstDay, 1);
          meal = 0;
        }
        this.firstDay = firstDay;
        /** Meal index on the first day that gets box 0; the meals before it have no box. */
        this.firstMeal = meal;
      } else {
        this.firstDay = startOfDay(today);
        this.firstMeal = 0;
      }
    }

    get mealsPerDay() {
      return this.mealMinutes.length;
    }

    get dayCount() {
      return Math.floor((this.firstMeal + this.boxCount + this.mealsPerDay - 1) / this.mealsPerDay);
    }

    get isRefilled() {
      return this.refilledAt != null;
    }

    /** When the last box gets used. */
    get emptyAt() {
      return this.useTimeOf(this.boxCount - 1);
    }

    /** Latest refill that still covers the meal after the last box. */
    get refillBy() {
      return this.useTimeOf(this.boxCount);
    }

    /** The box feeding the given meal of the given calendar day, or null if that meal has none. */
    boxAt(day, meal) {
      const box = day * this.mealsPerDay + meal - this.firstMeal;
      return box >= 0 && box < this.boxCount ? box : null;
    }

    mealTimeOf(box) {
      const slot = this.firstMeal + box;
      return at(addDays(this.firstDay, Math.floor(slot / this.mealsPerDay)), this.mealMinutes[slot % this.mealsPerDay]);
    }

    /** When the box's feed is put to soak, i.e. the box becomes empty. */
    useTimeOf(box) {
      return new Date(this.mealTimeOf(box) - this.soak);
    }

    isEaten(box, now) {
      return !this.isRefilled || this.useTimeOf(box) <= now;
    }

    boxesLeft(now) {
      let left = 0;
      for (let box = 0; box < this.boxCount; box++)
        if (!this.isEaten(box, now))
          left++;
      return left;
    }
  }

  return { FeedingSchedule, startOfDay, addDays };
})();
