import Link from "next/link";

export default async function Home() {
  return (
      <main>
        <div>Hello World</div>
        <Link href={'/auth'}>Auth</Link>
      </main>
  );
}
