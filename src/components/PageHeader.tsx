import React from 'react'

const KIWIMU_LOGO = "https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Kiwimu-English_syrudw.png"

export default function PageHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
      <div className="pointer-events-auto">
        <a href="/" aria-label="回首頁">
          <img
            src={KIWIMU_LOGO}
            alt="Kiwimu"
            className="h-8 md:h-9 w-auto object-contain"
            loading="eager"
            style={{ filter: 'brightness(0)' }}
          />
        </a>
      </div>
    </header>
  )
}
