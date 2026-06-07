(function (root) {
  const questions = [
    {
      id: 'role', module: 'baseline', type: 'text',
      title: 'What is your current role?',
      help: 'This anchors the operating model: the work you are responsible for and the decisions you own.',
      placeholder: 'e.g. Product Manager, Business Analyst, Founder', minLength: 2, maxLength: 100
    },
    {
      id: 'shipping', module: 'baseline', type: 'single',
      title: 'How often have you shipped something end-to-end yourself?',
      help: 'Count working outputs you built and delivered, not specifications handed to someone else.',
      options: [
        ['never', 'Never'],
        ['help', 'Once or twice, with substantial help'],
        ['few', 'A few times'],
        ['regular', 'Regularly']
      ]
    },
    {
      id: 'break_response', module: 'baseline', type: 'long',
      title: 'When your last build or automation failed, what did you tell yourself?',
      help: 'The response to a break often determines whether a useful experiment continues.',
      placeholder: 'Write the sentence that appeared in your head.', minLength: 20, maxLength: 700
    },
    {
      id: 'success_metrics', module: 'opt', type: 'long',
      title: 'What goals and metrics define success in your role?',
      help: 'Automation is only useful when it improves an outcome that already matters.',
      placeholder: 'Name the goal, then the metric or evidence you use to judge it.', minLength: 25, maxLength: 800
    },
    {
      id: 'users_customers', module: 'opt', type: 'long',
      title: 'Who are your users or customers, and what do they need from you?',
      help: 'This keeps any automation tied to a real user need rather than a tool demonstration.',
      placeholder: 'Describe the people, their situation, and the outcome they need.', minLength: 25, maxLength: 800
    },
    {
      id: 'core_processes', module: 'opt', type: 'long',
      title: 'What recurring processes do you run to achieve those goals?',
      help: 'Processes reveal where repeated work, delays, and handoffs accumulate.',
      placeholder: 'List the main workflows and briefly describe how each one runs.', minLength: 35, maxLength: 1000
    },
    {
      id: 'systems_data', module: 'opt', type: 'long',
      title: 'Which tools, systems, and data sources are involved?',
      help: 'The surrounding systems determine what an automation can read, change, and return.',
      placeholder: 'e.g. Jira, Notion, Slack, CRM, support tickets, research notes', minLength: 15, maxLength: 700
    },
    {
      id: 'commitment', module: 'availability', type: 'single',
      title: 'Can you protect one focused hour a day for seven days?',
      help: 'A useful plan must fit the time you can actually commit.',
      options: [
        ['yes', 'Yes, every day'],
        ['mostly', 'Most days; I may miss one or two'],
        ['unsure', 'Not reliably this week']
      ]
    }
  ];

  root.ROADMAP_DATA = {
    optPromptUrl: 'https://github.com/Siddhant-Goswami/100x-LLM/blob/main/prompts/OPT_COACH.md',
    modules: [
      { id: 'context', title: 'Context', number: '01' },
      { id: 'baseline', title: 'Builder baseline', number: '02' },
      { id: 'opt', title: 'OPT assessment', number: '03' },
      { id: 'availability', title: 'Availability', number: '04' },
      { id: 'contact', title: 'Contact details', number: '05' },
      { id: 'result', title: 'Assessment summary', number: '06' }
    ],
    introSteps: [
      {
        id: 'welcome', module: 'context', type: 'intro',
        title: 'Find the work where applied AI can create measurable leverage.',
        subtitle: 'This assessment looks at your operating context, how you respond when a build fails, and where automation could improve work that already matters.',
        body: 'Your answers will be reviewed by our team. We will use them to design a focused seven-day plan and send it to the WhatsApp number you provide.'
      },
      {
        id: 'opt_explainer', module: 'context', type: 'opt',
        eyebrow: 'Operating model → Process → Task',
        title: 'Start with the work. Narrow down to the task.',
        body: 'Your operating model defines success. Processes are the recurring ways you deliver it. Tasks are the discrete actions inside those processes that may be suitable for automation.'
      }
    ],
    questions
  };
})(typeof window !== 'undefined' ? window : globalThis);
