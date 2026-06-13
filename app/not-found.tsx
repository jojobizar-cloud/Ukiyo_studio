import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="page-hero compact-hero">
        <div>
          <p className="eyebrow">Not found</p>
          <h1>This page does not exist</h1>
          <p>The workshop or page you are looking for could not be found.</p>
          <Link className="button button-primary" href="/workshops">
            View workshops
          </Link>
        </div>
      </section>
    </main>
  );
}
