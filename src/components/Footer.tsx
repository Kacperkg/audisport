export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t  px-4 pb-14 pt-10">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center">
        <p className="m-0 text-sm">
          &copy; {year} Kacper Gajdarski. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
