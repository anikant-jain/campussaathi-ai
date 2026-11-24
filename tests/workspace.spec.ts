import { expect,test } from '@playwright/test';
async function signIn(page:import('@playwright/test').Page,role='Student'){
  await page.goto('/login');
  await page.getByRole('button',{name:role,exact:true}).click();
  await expect(page).toHaveURL(/\/app$/);
}
test('landing, student dashboard, theme, search and assistant conversation',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'One Campus. One Platform. Infinite Possibilities.'})).toBeVisible();
  await signIn(page);
  await expect(page.getByRole('heading',{name:/Aman/})).toBeVisible();
  await expect(page.getByText('86%',{exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('student-overview.png'),animations:'disabled'});
  await page.getByRole('button',{name:'Use dark theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.keyboard.press('Control+k');
  const palette=page.getByRole('dialog');
  await expect(palette).toBeVisible();
  await palette.getByRole('searchbox').fill('Digital');
  await expect(palette.getByRole('link',{name:'Digital Library'})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('textbox',{name:'Ask anything about your campus'}).fill('What is my attendance?');
  await page.getByRole('button',{name:'Ask campus assistant'}).click();
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText(/43 of 50 classes/)).toBeVisible();
  await expect(page.getByText('Database demo',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Rename conversation'}).click();
  await page.getByRole('textbox',{name:'Conversation title'}).fill('My attendance check');
  await page.getByRole('dialog').getByRole('button',{name:'Save'}).click();
  await expect(page.getByRole('button',{name:'My attendance check'})).toBeVisible();
  expect(errors).toEqual([]);
});
test('register for an event and cancel it from the event dialog',async({page})=>{
  await signIn(page);
  await page.goto('/app/events?event=event-0');
  const dialog=page.getByRole('dialog',{name:'Build for Bharat 2026'});
  await dialog.getByRole('button',{name:'Register for event'}).click();
  await expect(dialog.getByRole('button',{name:'Cancel registration'})).toBeVisible();
  await dialog.getByRole('button',{name:'Cancel registration'}).click();
  await expect(dialog.getByRole('button',{name:'Register for event'})).toBeVisible();
});
test('exam plan preview, approval, and progress persist',async({page})=>{
  await signIn(page);
  await page.goto('/app/exam-panic');
  await page.getByLabel('Subject',{exact:true}).fill('Algorithms');
  await page.getByLabel('Syllabus topics').fill('Graphs, Trees');
  await page.getByLabel('Weak topics').fill('Graphs');
  await page.getByRole('button',{name:'Preview study plan'}).click();
  await expect(page.getByRole('heading',{name:'Algorithms preparation'})).toBeVisible();
  await page.getByRole('button',{name:'Approve and save plan'}).click();
  await page.getByLabel('Graphs',{exact:true}).check();
  await expect(page.getByText('1 of 2 topics complete')).toBeVisible();
  await expect(page.getByText('Progress saved',{exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Algorithms preparation'}).click();
  await expect(page.getByLabel('Graphs',{exact:true})).toBeChecked();
});
test('mobile map and navigation fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await signIn(page);
  await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
  await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('dialog').getByRole('link',{name:'Campus Map'}).click();
  await page.getByRole('combobox',{name:'To',exact:true}).selectOption('library');
  await page.getByLabel('Step-free route').check();
  await page.getByRole('button',{name:'Find route'}).click();
  await expect(page.getByText('Main Gate → Administration → Technology Block → Central Library')).toBeVisible();
  const view=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(view.scroll).toBeLessThanOrEqual(view.inner);
});
test('faculty, librarian, placement, and administrator workspaces open',async({browser})=>{
  for(const [role,path,heading] of [
    ['Faculty','/app/teaching','Teaching Assistant'],
    ['Librarian','/app/library','Digital Library'],
    ['Placement Officer','/app/placements','Placement Coach'],
    ['Administrator','/app/directory','Campus Directory'],
  ]){
    const page=await browser.newPage();
    try{await signIn(page,role);await page.goto(path);await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();}
    finally{await page.close();}
  }
});
test('student can preview and submit a complaint',async({page})=>{
  await signIn(page);
  await page.goto('/app/complaints');
  await page.getByRole('button',{name:'Report an issue'}).click();
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Title (optional)').fill('Lab network issue');
  await modal.getByLabel('Describe the issue').fill('The Wi-Fi stops working during lab sessions.');
  await modal.getByRole('button',{name:'Preview classification'}).click();
  await expect(modal.getByText('Rule-based suggestion')).toBeVisible();
  await modal.getByRole('button',{name:'Submit complaint'}).click();
  await page.getByRole('button',{name:/Lab network issue/}).click();
  await expect(page.getByRole('dialog').getByText('Complaint registered')).toBeVisible();
});
test('student can reserve a catalog book and see the hold',async({page})=>{
  await signIn(page);
  await page.goto('/app/library');
  await page.getByRole('searchbox',{name:'Search books'}).fill('Python');
  await page.getByRole('button',{name:'Details'}).click();
  await page.getByRole('dialog',{name:'Python Crash Course'}).getByRole('button',{name:'Reserve a copy'}).click();
  await page.getByRole('button',{name:'Loans & holds'}).click();
  await expect(page.getByRole('heading',{name:'My holds'})).toBeVisible();
  await expect(page.getByText('Python Crash Course',{exact:true})).toBeVisible();
});
test('student can grade a practice deck and resume a mock interview',async({page})=>{
  await signIn(page);
  await page.goto('/app/practice');
  await page.getByRole('button',{name:'Coding fundamentals'}).click();
  await page.getByRole('button',{name:'Approve and save deck'}).click();
  await page.getByRole('radio',{name:'Queue',exact:true}).check();
  await page.getByRole('radio',{name:'Breadth-first search',exact:true}).check();
  await page.getByRole('radio',{name:'O(log n)',exact:true}).check();
  await page.getByRole('button',{name:'Grade quiz'}).click();
  await expect(page.getByText('Score: 3 / 3',{exact:true})).toBeVisible();
  await page.goto('/app/placements');
  await page.getByRole('button',{name:'Prepare',exact:true}).click();
  await page.getByRole('button',{name:'Start interview'}).click();
  for(const question of [/debug a slow API/,/queue and a stack/,/parses user input/]){
    await page.getByRole('textbox',{name:question}).fill('I would start with a small example, record the result, then compare alternatives.');
  }
  await page.getByRole('button',{name:'Save answers'}).click();
  await page.getByRole('button',{name:'Interview history'}).click();
  await page.getByText(/Software engineering intern · technical/).click();
  await expect(page.getByText(/I would start with a small example/).first()).toBeVisible();
});

