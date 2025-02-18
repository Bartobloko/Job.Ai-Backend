const puppeteer  = require("puppeteer");
const {scrapeTalentCom} = require("./utils/talent");
const {scrapeLinkedInJobs} = require("./utils/linkedin");
const {scrapeNoFluffJobs} = require("./utils/nofluffjobs");
const {scrapeTheProtocol} = require("./utils/theprotocol");
const {scrapeJustJoin} = require("./utils/justjoin");
const {getAccountSettings} = require("./utils/utils");


async function scrapeJobOffers(accountId) {
    // Get account settings including LinkedIn cookie and custom links
    let accountSettings;
    try {
        accountSettings = await getAccountSettings(accountId);
    } catch (error) {
        console.error(`Error retrieving account settings: ${error.message}`);
        accountSettings = {}; // Use default settings if we can't get account settings
    }

    const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 920, height: 680 } });
    const page = await browser.newPage();

    // Set LinkedIn cookie if available
    if (accountSettings.linkedIn_li_at_cookie) {
        const cookie = {
            name: 'li_at',
            value: accountSettings.linkedIn_li_at_cookie,
            domain: '.www.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true,
        };
        await page.setCookie(cookie);
        console.log('LinkedIn cookie set from account settings');
    } else {
        console.log('No LinkedIn cookie found in account settings, using default behavior');
    }

    const allJobDetails = [];

    // Scrape each site with custom links if available
    try {
        allJobDetails.push(...await scrapeJustJoin(page, accountSettings.justJoin_links));
    } catch (error) {
        console.error('Error scraping JustJoin.it:', error.message);
    }

    try {
        allJobDetails.push(...await scrapeTheProtocol(page, accountSettings.theProtocol_links));
    } catch (error) {
        console.error('Error scraping TheProtocol.it:', error.message);
    }

    try {
        allJobDetails.push(...await scrapeNoFluffJobs(page, accountSettings.noFluffJobs_links));
    } catch (error) {
        console.error('Error scraping NoFluffJobs:', error.message);
    }

    try {
        allJobDetails.push(...await scrapeLinkedInJobs(page, accountSettings.linkedIn_links, accountSettings.linkedIn_li_at_cookie));
    } catch (error) {
        console.error('Error scraping LinkedIn Jobs:', error.message);
    }

    try {
        allJobDetails.push(...await scrapeTalentCom(page, accountSettings.talent_links));
    } catch (error) {
        console.error('Error scraping Talent.com:', error.message);
    }

    await browser.close();
    console.log('Zamknięto przeglądarkę');
    return allJobDetails;
}

module.exports = { scrapeJobOffers };