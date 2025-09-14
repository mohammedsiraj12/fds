import { Tab } from '@headlessui/react';
import clsx from 'clsx';

export default function Tabs({ tabs, children, defaultIndex = 0 }) {
  return (
    <Tab.Group defaultIndex={defaultIndex}>
      <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              clsx(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            {tab.label}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-2">
        {children}
      </Tab.Panels>
    </Tab.Group>
  );
}

export function TabPanel({ children, className = "" }) {
  return (
    <Tab.Panel
      className={clsx(
        'rounded-xl bg-white p-3',
        'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
        className
      )}
    >
      {children}
    </Tab.Panel>
  );
}
