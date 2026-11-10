import type { Priority, Status } from './schema.js';

export type PersonKey = 'alex' | 'sam' | 'priya' | 'jonas' | 'mei' | 'lucas';

export interface PersonSeed {
  key: PersonKey;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'member';
  isProtected: boolean;
}

/** Invented people only. The demo and member passwords are public by design. */
export const PEOPLE: PersonSeed[] = [
  {
    key: 'alex',
    name: 'Alex Morgan',
    email: 'demo@taskflow.dev',
    password: 'Demo123!',
    role: 'admin',
    isProtected: true,
  },
  {
    key: 'sam',
    name: 'Sam Rivera',
    email: 'member@taskflow.dev',
    password: 'Member123!',
    role: 'member',
    isProtected: true,
  },
  {
    key: 'priya',
    name: 'Priya Shah',
    email: 'priya@taskflow.dev',
    password: 'Demo123!',
    role: 'member',
    isProtected: false,
  },
  {
    key: 'jonas',
    name: 'Jonas Weber',
    email: 'jonas@taskflow.dev',
    password: 'Demo123!',
    role: 'member',
    isProtected: false,
  },
  {
    key: 'mei',
    name: 'Mei Tanaka',
    email: 'mei@taskflow.dev',
    password: 'Demo123!',
    role: 'member',
    isProtected: false,
  },
  {
    key: 'lucas',
    name: 'Lucas Oliveira',
    email: 'lucas@taskflow.dev',
    password: 'Demo123!',
    role: 'member',
    isProtected: false,
  },
];

export const LABELS = [
  { name: 'design', color: '#7C3AED' },
  { name: 'frontend', color: '#2F5BEA' },
  { name: 'backend', color: '#0E7490' },
  { name: 'bug', color: '#DC2626' },
  { name: 'content', color: '#CA8A04' },
  { name: 'research', color: '#16A34A' },
];

export interface TaskSeed {
  title: string;
  status: Status;
  priority: Priority;
  /** Days from today (negative = past). */
  due: number | null;
  who: PersonKey | null;
  labels: string[];
  desc?: string;
  /** For done tasks: how many days ago it was completed. */
  doneDaysAgo?: number;
  comments?: [PersonKey, string][];
}

export interface ProjectSeed {
  name: string;
  key: string;
  description: string;
  color: string;
  owner: PersonKey;
  members: PersonKey[];
  invites?: string[];
  tasks: TaskSeed[];
}

export const PROJECTS: ProjectSeed[] = [
  {
    name: 'Website Redesign',
    key: 'WEB',
    description: 'Refresh the marketing site: clearer story, faster pages, accessible components.',
    color: '#2F5BEA',
    owner: 'alex',
    members: ['alex', 'sam', 'priya', 'jonas', 'mei'],
    invites: ['taylor@example.com'],
    tasks: [
      {
        title: 'Audit current landing page copy',
        status: 'done',
        priority: 'medium',
        due: -13,
        who: 'mei',
        labels: ['content', 'research'],
        doneDaysAgo: 12,
        desc: 'Review every section of the landing page and flag unclear or outdated claims.\n\n- Hero and subheading\n- Pricing blurb\n- Footer links',
      },
      {
        title: 'Define new colour palette and type scale',
        status: 'done',
        priority: 'high',
        due: -10,
        who: 'priya',
        labels: ['design'],
        doneDaysAgo: 9,
        comments: [
          ['alex', 'Love the blue. Can we check contrast on the muted grays?'],
          ['priya', 'Done, all pairs pass AA now.'],
        ],
      },
      {
        title: 'Set up component library in Storybook',
        status: 'done',
        priority: 'medium',
        due: -7,
        who: 'jonas',
        labels: ['frontend'],
        doneDaysAgo: 6,
      },
      {
        title: 'Write new homepage headline options',
        status: 'done',
        priority: 'low',
        due: -6,
        who: 'mei',
        labels: ['content'],
        doneDaysAgo: 4,
      },
      {
        title: 'Choose hosting and CDN setup',
        status: 'done',
        priority: 'medium',
        due: -4,
        who: 'jonas',
        labels: ['backend', 'research'],
        doneDaysAgo: 2,
      },
      {
        title: 'Compress hero images',
        status: 'done',
        priority: 'low',
        due: -2,
        who: 'sam',
        labels: ['frontend'],
        doneDaysAgo: 0,
      },
      {
        title: 'Build responsive navigation',
        status: 'in_progress',
        priority: 'high',
        due: 2,
        who: 'jonas',
        labels: ['frontend'],
        desc: '## Scope\n\n1. Desktop mega-menu\n2. Mobile slide-out drawer\n3. Keyboard navigation and focus trapping\n\nDesign is in the shared file under **Navigation v3**.',
        comments: [
          ['sam', 'Drawer animation feels a bit slow on my phone.'],
          ['jonas', 'Will shorten to 180ms and respect reduced motion.'],
        ],
      },
      {
        title: 'Design pricing page layout',
        status: 'in_progress',
        priority: 'medium',
        due: 4,
        who: 'priya',
        labels: ['design'],
      },
      {
        title: 'Fix checkout button contrast on mobile',
        status: 'in_progress',
        priority: 'urgent',
        due: -1,
        who: 'sam',
        labels: ['bug', 'frontend'],
        desc: 'The primary button text is hard to read in bright light.\n\n**Expected:** contrast ratio of at least 4.5:1.',
        comments: [['alex', 'Customers keep mentioning this, bumping to urgent.']],
      },
      {
        title: 'Migrate blog posts to the new template',
        status: 'todo',
        priority: 'medium',
        due: 9,
        who: 'mei',
        labels: ['content'],
      },
      {
        title: 'Add structured data for SEO',
        status: 'todo',
        priority: 'low',
        due: 14,
        who: null,
        labels: ['backend'],
      },
      {
        title: 'Accessibility review with screen reader',
        status: 'todo',
        priority: 'high',
        due: 0,
        who: 'sam',
        labels: ['research', 'frontend'],
        desc: 'Walk through the main flows with a screen reader and keyboard only. Record issues in this task.',
      },
      {
        title: 'Prepare launch announcement',
        status: 'todo',
        priority: 'medium',
        due: 18,
        who: 'alex',
        labels: ['content'],
      },
      {
        title: 'Redirect map for old URLs',
        status: 'todo',
        priority: 'high',
        due: -3,
        who: 'jonas',
        labels: ['backend'],
        desc: 'List every legacy URL and its new destination so nothing returns a 404 after launch.',
      },
    ],
  },
  {
    name: 'Mobile App Launch',
    key: 'APP',
    description: 'Ship version 1.0 of the companion mobile app to both stores.',
    color: '#7C3AED',
    owner: 'alex',
    members: ['alex', 'sam', 'priya', 'lucas'],
    tasks: [
      {
        title: 'Finalize onboarding flow',
        status: 'done',
        priority: 'high',
        due: -12,
        who: 'priya',
        labels: ['design'],
        doneDaysAgo: 11,
      },
      {
        title: 'Set up crash reporting',
        status: 'done',
        priority: 'medium',
        due: -9,
        who: 'lucas',
        labels: ['backend'],
        doneDaysAgo: 8,
      },
      {
        title: 'Implement push notification opt-in',
        status: 'done',
        priority: 'medium',
        due: -6,
        who: 'sam',
        labels: ['frontend'],
        doneDaysAgo: 5,
      },
      {
        title: 'Write store listing description',
        status: 'done',
        priority: 'low',
        due: -4,
        who: 'alex',
        labels: ['content'],
        doneDaysAgo: 3,
      },
      {
        title: 'Create app icon variants',
        status: 'done',
        priority: 'medium',
        due: -3,
        who: 'priya',
        labels: ['design'],
        doneDaysAgo: 1,
      },
      {
        title: 'Offline mode for task list',
        status: 'in_progress',
        priority: 'urgent',
        due: 1,
        who: 'lucas',
        labels: ['backend', 'frontend'],
        desc: '## Goals\n\n- Cache the last 50 tasks\n- Queue edits and sync when back online\n- Show a clear "offline" banner',
        comments: [
          ['sam', 'Should conflicts prefer the server version?'],
          ['lucas', 'Yes for now, we show a toast when we overwrite.'],
        ],
      },
      {
        title: 'Fix crash when rotating the device',
        status: 'in_progress',
        priority: 'high',
        due: 2,
        who: 'sam',
        labels: ['bug'],
      },
      {
        title: 'Prepare App Store screenshots',
        status: 'in_progress',
        priority: 'medium',
        due: 6,
        who: 'priya',
        labels: ['design', 'content'],
      },
      {
        title: 'Beta feedback triage',
        status: 'todo',
        priority: 'high',
        due: -2,
        who: 'alex',
        labels: ['research'],
        desc: 'Go through all feedback from the beta testers and group it into themes.',
      },
      {
        title: 'Localize strings for Spanish and German',
        status: 'todo',
        priority: 'low',
        due: 20,
        who: null,
        labels: ['content'],
      },
      {
        title: 'Performance pass on the home screen',
        status: 'todo',
        priority: 'medium',
        due: 8,
        who: 'lucas',
        labels: ['frontend'],
      },
      {
        title: 'Submit build for store review',
        status: 'todo',
        priority: 'urgent',
        due: 11,
        who: 'alex',
        labels: [],
      },
    ],
  },
  {
    name: 'Q1 Marketing Campaign',
    key: 'MKT',
    description: 'Plan and run the spring campaign across email, social and the blog.',
    color: '#EA580C',
    owner: 'mei',
    members: ['mei', 'lucas', 'alex'],
    tasks: [
      {
        title: 'Define campaign goals and KPIs',
        status: 'done',
        priority: 'high',
        due: -13,
        who: 'mei',
        labels: ['research'],
        doneDaysAgo: 13,
      },
      {
        title: 'Competitor messaging review',
        status: 'done',
        priority: 'medium',
        due: -8,
        who: 'lucas',
        labels: ['research'],
        doneDaysAgo: 7,
      },
      {
        title: 'Draft email sequence (3 emails)',
        status: 'done',
        priority: 'medium',
        due: -5,
        who: 'mei',
        labels: ['content'],
        doneDaysAgo: 3,
      },
      {
        title: 'Book guest webinar speaker',
        status: 'done',
        priority: 'low',
        due: -3,
        who: 'alex',
        labels: [],
        doneDaysAgo: 2,
      },
      {
        title: 'Design social media templates',
        status: 'in_progress',
        priority: 'medium',
        due: 1,
        who: 'lucas',
        labels: ['design'],
        desc: 'Three formats: square, story and wide. Keep brand colours and leave room for a short headline.',
      },
      {
        title: 'Write launch blog post',
        status: 'in_progress',
        priority: 'high',
        due: 3,
        who: 'mei',
        labels: ['content'],
        comments: [['alex', 'Can we add a customer quote near the top?']],
      },
      {
        title: 'Set up campaign tracking links',
        status: 'todo',
        priority: 'medium',
        due: -1,
        who: 'lucas',
        labels: ['backend'],
      },
      {
        title: 'Schedule social posts for week one',
        status: 'todo',
        priority: 'low',
        due: 10,
        who: null,
        labels: ['content'],
      },
      {
        title: 'Review webinar slide deck',
        status: 'todo',
        priority: 'medium',
        due: 0,
        who: 'alex',
        labels: ['content'],
      },
      {
        title: 'Budget check-in with finance',
        status: 'todo',
        priority: 'high',
        due: 15,
        who: 'mei',
        labels: [],
      },
    ],
  },
];
