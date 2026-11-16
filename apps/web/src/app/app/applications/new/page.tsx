'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { CreateApplicationSchema, type CreateApplicationInput } from '@fitcv/shared';
import { Alert, Button, Card, Field, Input, Textarea } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useCreateApplication } from '@/lib/queries';

export default function NewApplicationPage() {
  const router = useRouter();
  const create = useCreateApplication();
  const form = useForm<CreateApplicationInput>({
    resolver: zodResolver(CreateApplicationSchema) as never,
    mode: 'onBlur',
    defaultValues: { company: '', jobTitle: '', jobUrl: '', jobDescription: '' },
  });
  const { errors } = form.formState;
  const jdLength = form.watch('jobDescription').length;

  const onSubmit = form.handleSubmit(async (values) => {
    const { application } = await create.mutateAsync(values);
    router.push(`/app/applications/${application.id}`);
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Applications
      </Link>
      <h1 className="display mt-2 text-4xl">New application</h1>
      <p className="mt-1 text-sm text-muted">
        Paste the full job posting. The more detail, the sharper the tailoring.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message}>
              <Input
                id="jobTitle"
                placeholder="Backend Engineer"
                aria-invalid={!!errors.jobTitle}
                {...form.register('jobTitle')}
              />
            </Field>
            <Field label="Company" htmlFor="company" error={errors.company?.message}>
              <Input
                id="company"
                placeholder="Safaricom"
                aria-invalid={!!errors.company}
                {...form.register('company')}
              />
            </Field>
          </div>
          <Field
            label="Job posting link (optional)"
            htmlFor="jobUrl"
            error={errors.jobUrl?.message}
          >
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://…"
              aria-invalid={!!errors.jobUrl}
              {...form.register('jobUrl')}
            />
          </Field>
          <Field
            label="Job description"
            htmlFor="jobDescription"
            error={errors.jobDescription?.message}
            hint={`${jdLength.toLocaleString()} / 20,000 characters`}
          >
            <Textarea
              id="jobDescription"
              rows={14}
              placeholder="Paste responsibilities, requirements and nice-to-haves…"
              aria-invalid={!!errors.jobDescription}
              {...form.register('jobDescription')}
            />
          </Field>
          {create.error && <Alert>{errorMessage(create.error)}</Alert>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push('/app')}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Save application
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
