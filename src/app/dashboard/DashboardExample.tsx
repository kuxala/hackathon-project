'use client'

import { ChatWidget } from './components/ChatWidget'
import { DashboardHeader } from './components/DashboardHeader'

interface DashboardExampleProps {
  user?: {
    email?: string
  }
  onSignOut?: () => void
}

export default function DashboardExample({ user, onSignOut }: DashboardExampleProps) {
  return (
    <div className="flex min-h-screen w-full flex-col relative bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={onSignOut} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-50">Financial Overview</h1>
              <p className="mt-1 text-base text-gray-400">Your financial health at a glance</p>
            </div>
            <button className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Import
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-medium text-gray-200">Spending vs. Income</p>
                  <p className="text-3xl font-bold tracking-tight text-gray-50">$12,500</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-sm text-gray-400">Last 12 Months</p>
                    <p className="text-sm font-medium text-green-500">+5%</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded bg-primary/20 px-3 py-1 text-sm font-medium text-primary">Income</button>
                  <button className="rounded bg-[rgb(30,30,30)] px-3 py-1 text-sm font-medium text-gray-300">Spending</button>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 472 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25" stroke="#12a159" strokeLinecap="round" strokeWidth="2.5"></path>
                  <path d="M0 130 C 18.1538 130 18.1538 80 36.3077 80 C 54.4615 80 54.4615 100 72.6154 100 C 90.7692 100 90.7692 60 108.923 60 C 127.077 60 127.077 90 145.231 90 C 163.385 90 163.385 50 181.538 50 C 199.692 50 199.692 80 217.846 80 C 236 80 236 110 254.154 110 C 272.308 110 272.308 70 290.462 70 C 308.615 70 308.615 95 326.769 95 C 344.923 95 344.923 65 363.077 65 C 381.231 65 381.231 105 399.385 105 C 417.538 105 417.538 75 435.692 75 C 453.846 75 453.846 115 472 115" stroke="#a78bfa" strokeLinecap="round" strokeOpacity="0.5" strokeWidth="2.5"></path>
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-2">
              <div>
                <p className="text-base font-medium text-gray-200">Loan &amp; Debt Overview</p>
                <p className="text-3xl font-bold tracking-tight text-gray-50">$25,000</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="text-sm text-gray-400">Current</p>
                  <p className="text-sm font-medium text-red-500">-2%</p>
                </div>
              </div>
              <div className="grid h-[200px] grid-cols-4 items-end gap-4 px-2 pt-4">
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '10%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Mortgage</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '25%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Car Loan</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-rose-400" style={{height: '75%'}}></div>
                  <p className="text-xs font-medium text-gray-400">Credit Card</p>
                </div>
                <div className="flex h-full flex-col items-center justify-end gap-2">
                  <div className="w-full rounded-t bg-primary" style={{height: '40%'}}></div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Student Loan</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-background-light p-6 shadow-sm dark:border-primary/30 dark:bg-background-dark lg:col-span-1">
              <div>
                <p className="text-base font-medium text-gray-800 dark:text-gray-200">Budget &amp; Forecast</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">$5,000</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Next 6 Months</p>
                  <p className="text-sm font-medium text-green-500">+10%</p>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <svg fill="none" height="100%" preserveAspectRatio="none" viewBox="0 0 472 150" width="100%" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25 V 150 H 0 Z" fill="url(#paint0_linear_budget)"></path>
                  <path d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25" stroke="#f472b6" strokeLinecap="round" strokeWidth="2.5"></path>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_budget" x1="236" x2="236" y1="1" y2="150">
                      <stop stopColor="#f472b6" stopOpacity="0.3"></stop>
                      <stop offset="1" stopColor="#f472b6" stopOpacity="0"></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}
