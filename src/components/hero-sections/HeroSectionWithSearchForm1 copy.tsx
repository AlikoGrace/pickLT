// import ButtonPrimary from '@/shared/ButtonPrimary'
// import clsx from 'clsx'
// import Image, { StaticImageData } from 'next/image'

// const HeroSectionWithSearchForm1 = ({
//   className,
//   buttonLink,
//   buttonText,
//   children,
//   description,
//   heading,
//   imageAlt,
//   image,
// }: {
//   className?: string
//   heading: string
//   description: string
//   buttonText: string
//   buttonLink: string
//   image: StaticImageData
//   imageAlt: string
//   children: React.ReactNode
// }) => {
//   return (
//     <div className={clsx('relative flex flex-col-reverse lg:flex-col', className)}>
//       <div className="flex flex-col lg:flex-row lg:items-center">
//         <div className="flex shrink-0 flex-col items-start gap-y-8 pb-14 sm:gap-y-10 lg:me-10 lg:w-1/2 lg:pb-64 xl:me-0 xl:pe-14">
//           <h2 className="text-4xl/[1.15] font-medium md:text-5xl/[1.15] xl:text-7xl/[1.15]">{heading}</h2>
//           <span className="text-base text-neutral-500 md:text-lg dark:text-neutral-400">{description}</span>
//           <ButtonPrimary href={buttonLink} className="sm:text-base/normal">
//             {buttonText}
//           </ButtonPrimary>
//         </div>
//         <div className="grow">
//           <Image className="w-full" src={image} alt={imageAlt} priority />
//         </div>
//       </div>

//       {children}
//     </div>
//   )
// }

// export default HeroSectionWithSearchForm1
