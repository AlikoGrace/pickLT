import { redirect } from 'next/navigation'

/**
 * `/stay-categories/<handle>` is a leftover from the marketplace template this
 * app was built on: it rendered a grid of fabricated holiday rentals ("Over
 * 1,000 places in Singapore") under the PickLT brand. It was reachable in
 * practice — the sidebar navigation on every page links to
 * `/stay-categories-map/all`, whose close button links back here.
 *
 * The redirect used to be conditional (`if (!category?.id)`), so every fixture
 * handle in `src/data/categories.ts` rendered the fake grid. It is now
 * unconditional, and the page body is gone. The URL is kept (rather than
 * deleted) so existing links and indexed URLs land on the booking flow instead
 * of a 404.
 */
const Page = async () => {
  return redirect('/add-listing/1')
}

export default Page
