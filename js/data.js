(function (root) {
  const questions = [
    {
      id: 'role', module: 'profile', type: 'text', title: 'What is your current role or title?',
      placeholder: 'e.g. Product Manager, Business Analyst, Founder', minLength: 2, maxLength: 100
    },
    {
      id: 'path', module: 'profile', type: 'single', title: 'Which path brought you here?',
      options: [
        ['nontechnical', 'Analytics, data, business, or management. I have never built end-to-end.'],
        ['technical', 'Design or engineering, then moved into product.'],
        ['switcher', 'I am in another role and want to move into AI-native product work.'],
        ['founder', 'Founder or solo operator.']
      ]
    },
    {
      id: 'employment', module: 'profile', type: 'single', title: 'Which best describes your current situation?',
      options: [
        ['employed', 'Employed full-time'],
        ['worried', 'Employed, but actively worried about my role'],
        ['between', 'Between roles or recently laid off'],
        ['independent', 'Freelance, consulting, or founder']
      ]
    },
    {
      id: 'shipping', module: 'profile', type: 'single', title: 'Have you shipped something end-to-end yourself?',
      help: 'Built and delivered it, rather than writing the spec and handing it off.',
      options: [
        ['never', 'Never'],
        ['help', 'Once or twice, with a lot of help'],
        ['few', 'A few times, but I do not think of myself as someone who builds'],
        ['regular', 'Yes, regularly']
      ]
    },
    {
      id: 'builder_identity', module: 'identity', type: 'long',
      title: 'Finish this sentence honestly:',
      help: '“When it comes to building things myself, I am the kind of person who...”',
      placeholder: 'Write the first true answer, not the impressive one.', minLength: 20, maxLength: 600
    },
    {
      id: 'break_response', module: 'identity', type: 'long',
      title: 'Think of the last time a build or automation broke. What did you tell yourself?',
      placeholder: 'What was the sentence in your head at that moment?', minLength: 20, maxLength: 700
    },
    {
      id: 'attempts', module: 'momentum', type: 'multi',
      title: 'What have you already done to close this gap?',
      options: [
        ['tutorials', 'Watched tutorials or YouTube'],
        ['course', 'Started an online course'],
        ['paid', 'Invested money in learning or hands-on support'],
        ['built', 'Tried to build something on my own'],
        ['nothing', 'Nothing yet. This is my first real step.']
      ]
    },
    {
      id: 'prior_effort', module: 'momentum', type: 'long',
      title: 'What happened when you tried?',
      help: 'If this is your first step, tell us what finally made you start now.',
      placeholder: 'What did you spend time on, and where did it stall?', minLength: 15, maxLength: 700
    },
    {
      id: 'workflow', module: 'workflow', type: 'long',
      title: 'Name one repetitive work task you wish would disappear.',
      placeholder: 'Describe what comes in, what you do repeatedly, and what should come out.', minLength: 25, maxLength: 800
    },
    {
      id: 'tools', module: 'workflow', type: 'multi', other: true,
      title: 'Which tools do you live in day to day?',
      options: [
        ['notion', 'Notion'], ['jira', 'Jira or Linear'], ['sheets', 'Excel or Google Sheets'],
        ['slack', 'Slack or Teams'], ['email', 'Email'], ['figma', 'Figma'],
        ['analytics', 'Amplitude or Mixpanel'], ['crm', 'CRM']
      ]
    },
    {
      id: 'desired_build', module: 'workflow', type: 'long',
      title: 'What working thing would you want to show in your next 1:1?',
      placeholder: 'One concrete outcome your lead could see or use.', minLength: 20, maxLength: 700
    },
    {
      id: 'focus_time', module: 'commitment', type: 'single',
      title: 'When is one focused hour most likely to happen?',
      options: [
        ['morning', 'Early morning'], ['lunch', 'Lunch'], ['evening', 'Evening'],
        ['late', 'Late night'], ['weekend', 'Weekends only']
      ]
    },
    {
      id: 'commitment', module: 'commitment', type: 'single',
      title: 'Can you commit one hour a day for seven days?',
      options: [
        ['yes', 'Yes, fully'],
        ['mostly', 'Mostly. I may miss one or two days.'],
        ['unsure', 'Honestly unsure']
      ]
    },
    {
      id: 'why_now', module: 'commitment', type: 'long',
      title: 'Why this, and why now?',
      placeholder: 'What changes if you act now? What happens if you do not?', minLength: 25, maxLength: 800
    },
    {
      id: 'seat_case', module: 'commitment', type: 'long',
      title: 'Why should one of the limited sprint seats be yours?',
      help: 'Two specific lines are stronger than a motivational paragraph.',
      placeholder: 'Make the case in your own words.', minLength: 30, maxLength: 500
    }
  ];

  root.ROADMAP_DATA = {
    modules: [
      { id: 'shift', title: 'The shift', number: '01' },
      { id: 'profile', title: 'Your starting point', number: '02' },
      { id: 'identity', title: 'What happens at the break', number: '03' },
      { id: 'momentum', title: 'What you have tried', number: '04' },
      { id: 'workflow', title: 'Your build opportunity', number: '05' },
      { id: 'commitment', title: 'The next seven days', number: '06' },
      { id: 'contact', title: 'Unlock your roadmap', number: '07' },
      { id: 'result', title: 'Your roadmap', number: '08' }
    ],
    introSteps: [
      {
        id: 'welcome', module: 'shift', type: 'intro',
        title: 'The PM role is shifting. Find your place in it.',
        subtitle: 'This is not a test of how many AI tools you know. It is a diagnostic of whether you can turn a messy product problem into something working.',
        body: 'Answer the questions as you are today. At the end, you will get a practical seven-day build path based on your work, tools, and current confidence.'
      },
      {
        id: 'false_exits', module: 'shift', type: 'concept',
        eyebrow: 'The three false exits',
        title: 'More code, more prompts, or more waiting will not make you a shipper.',
        body: 'Learning can help, but collecting tutorials is not the same as completing a build. AI-native product work begins when you can take one real workflow from problem to working v1.',
        variant: 'exits'
      },
      {
        id: 'reframe', module: 'shift', type: 'concept',
        eyebrow: 'The useful reframe',
        title: 'An AI-Native PM is not defined by code. They ship end-to-end.',
        body: 'The old operating mode ends at a document and a handoff. The new one brings a working first version to the conversation. The distance between those modes is smaller than it looks.',
        variant: 'comparison'
      }
    ],
    questions
  };
})(typeof window !== 'undefined' ? window : globalThis);
