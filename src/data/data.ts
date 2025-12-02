import avatarImage1 from '@/images/avatars/Image-1.png'
import avatarImage2 from '@/images/avatars/Image-2.png'
import avatarImage3 from '@/images/avatars/Image-3.png'
import avatarImage4 from '@/images/avatars/Image-4.png'

export async function getListingReviews(handle: string) {
  return [
    {
      id: '1',
      title: "Can't say enough good things",
      rating: 5,
      content: 'Lovely hostess, very friendly! I would definitely stay here again. ',
      author: 'S. Walkinshaw',
      authorAvatar: avatarImage1,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
    {
      id: '2',
      title: 'Perfect for going out when you want to stay comfy',
      rating: 4,
      content: 'Excellent place. The host is super friendly, the room is clean and quiet.',
      author: 'Risako M',
      authorAvatar: avatarImage2,
      date: 'May 11, 2021',
      datetime: '2025-01-06',
    },
    {
      id: '3',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Very nice and friendly lady. Be pleasant to talk with her. The room looks better than in the pictures. ',
      author: 'Eden Birch',
      authorAvatar: avatarImage3,
      date: 'Aug 22, 2022',
      datetime: '2025-01-06',
    },
    {
      id: '4',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Lots of nice restaurants nearby and I tried two of them. I had so limited time in Paris this time and look forward to living here again.',
      author: 'Jonathan Edwards',
      authorAvatar: avatarImage4,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
  ]
}
export async function getBlogPosts() {
  return [
    {
      id: '1',
      title: 'Graduation Dresses: A Style Guide',
      handle: 'graduation-dresses-style-guide',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg',
        alt: 'Graduation Dresses: A Style Guide',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '2 min read',
      author: {
        name: 'Scott Walkinshaw',
        avatar: {
          src: avatarImage1.src,
          alt: 'Scott Walkinshaw',
          width: avatarImage1.width,
          height: avatarImage1.height,
        },
        description:
          'Scott Walkinshaw is a fashion designer and stylist with over 10 years of experience in the industry. He specializes in creating unique and stylish outfits for special occasions.',
      },
    },
    {
      id: '2',
      title: 'How to Wear Your Eid Pieces All Year Long',
      handle: 'how-to-wear-your-eid-pieces-all-year-long',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/840211/pexels-photo-840211.jpeg',
        alt: 'How to Wear Your Eid Pieces All Year Long',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Erica Alexander',
        avatar: {
          src: avatarImage2.src,
          alt: 'Erica Alexander',
          width: avatarImage2.width,
          height: avatarImage2.height,
        },
        description:
          'Erica Alexander is a fashion influencer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '3',
      title: 'The Must-Have Hijabi Friendly Fabrics for 2024',
      handle: 'the-must-have-hijabi-friendly-fabrics-for-2024',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.unsplash.com/photo-1665047189192-3a49516d496a?q=80&w=3874&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        alt: 'The Must-Have Hijabi Friendly Fabrics for 2024',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Wellie Edwards',
        avatar: {
          src: avatarImage3.src,
          alt: 'Wellie Edwards',
          width: avatarImage3.width,
          height: avatarImage3.height,
        },
        description:
          'Wellie Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '4',
      title: 'The Hijabi Friendly Fabrics for 2025',
      handle: 'the-must-have-hijabi-friendly-fabrics-for',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.unsplash.com/photo-1636522302676-79eb484e0b11?q=80&w=3637&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        alt: 'The Must-Have Hijabi Friendly Fabrics for 2024',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Alex Klein',
        avatar: {
          src: avatarImage4.src,
          alt: 'Alex Klein',
          width: avatarImage4.width,
          height: avatarImage4.height,
        },
        description:
          'Alex Klein is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '5',
      title: 'Boost your conversion rate',
      handle: 'boost-your-conversion-rate',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.unsplash.com/photo-1623876355139-cb77f029bd29?q=80&w=3296&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        alt: 'Boost your conversion rate',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Eden Birch',
        avatar: {
          src: avatarImage1.src,
          alt: 'Eden Birch',
          width: avatarImage1.width,
          height: avatarImage1.height,
        },
        description:
          'Eden Birch is a fashion designer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '6',
      title: 'Graduation Dresses: A Style Guide',
      handle: 'graduation-dresses-style-guide',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.unsplash.com/photo-1746699484949-869986068267?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwzNHx8fGVufDB8fHx8fA%3D%3D',
        alt: 'Graduation Dresses: A Style Guide',
        width: 3773,
        height: 600,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Scott Edwards',
        avatar: {
          src: avatarImage2.src,
          alt: 'Scott Edwards',
          width: avatarImage2.width,
          height: avatarImage2.height,
        },
        description:
          'Scott Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
  ]
}
export async function getBlogPostsByHandle(handle: string) {
  // lower case the handle
  handle = handle.toLowerCase()

  const posts = await getBlogPosts()
  const post = posts.find((post) => post.handle === handle)
  return {
    ...post,
    content: 'Lorem ipsum dolor ...',
    tags: ['fashion', 'style', 'trends'],
  }
}

//
export type TListingReivew = Awaited<ReturnType<typeof getListingReviews>>[number]
export type TBlogPost = Awaited<ReturnType<typeof getBlogPosts>>[number]
