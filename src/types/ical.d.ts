declare module "ical.js" {
  export class Component {
    constructor(jcalData: unknown);
    static fromString(str: string): Component;
    getAllSubcomponents(name: string): Component[];
    getFirstPropertyValue(name: string): unknown;
  }

  export class Event {
    constructor(component: Component);
    readonly startDate: Time;
    readonly endDate: Time;
    readonly summary: string;
    readonly description: string;
    readonly uid: string;
  }

  export class Time {
    toJSDate(): Date;
    toString(): string;
  }

  export function parse(str: string): unknown;
}
