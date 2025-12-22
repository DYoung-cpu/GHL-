// STEP 1: List all workflows on the page
// Paste this into browser console while on the workflow list page

(function() {
  console.clear();
  console.log('%c=== GHL WORKFLOW FINDER ===', 'color: #00ff00; font-size: 16px; font-weight: bold');

  // Find all workflow links
  const links = document.querySelectorAll('a[href*="/workflow/"]');
  const workflows = [];

  links.forEach((link, i) => {
    const href = link.href;
    // Skip folder links, only get actual workflow links
    if (href.includes('/workflow/') && !href.includes('/folder')) {
      const name = link.textContent.trim() || link.closest('tr')?.querySelector('td')?.textContent?.trim() || 'Unknown';
      const id = href.split('/workflow/')[1]?.split('/')[0]?.split('?')[0];
      if (id && id.length > 10) {
        workflows.push({ name: name.substring(0, 50), id, href });
      }
    }
  });

  // Remove duplicates
  const unique = [...new Map(workflows.map(w => [w.id, w])).values()];

  console.log(`\n%cFound ${unique.length} workflows:`, 'color: #ffff00; font-weight: bold');
  unique.forEach((w, i) => {
    console.log(`${i + 1}. ${w.name}`);
    console.log(`   ID: ${w.id}`);
  });

  // Store globally for other scripts
  window.GHL_WORKFLOWS = unique;

  console.log('\n%cWorkflows stored in window.GHL_WORKFLOWS', 'color: #00ffff');
  console.log('%cTo open a workflow, run: window.location.href = GHL_WORKFLOWS[0].href', 'color: #00ffff');

  return unique;
})();
