export const setPageTitle = (pageName) => {
  const baseTitle = "SFV Tech ";

  if (pageName) {
    document.title = `${baseTitle} | ${pageName}`;
  } else {
    document.title = baseTitle;
  }
};
