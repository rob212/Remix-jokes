import {
  json,
  redirect,
  useActionData,
  useCatch,
  Link,
  Form,
  useTransition,
} from 'remix'
import type { ActionFunction, LoaderFunction } from 'remix'
import { db } from '~/utils/db.server'
import { getUserId, requireUserId } from '~/utils/session.server'
import { JokeDisplay } from '~/components/joke'

type ActionData = {
  formError?: string
  fieldErrors?: {
    name: string | undefined
    content: string | undefined
  }
  fields?: {
    name: string
    content: string
  }
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }
  return {}
}

function validateJokeName(name: string) {
  if (name.length < 2) {
    return "That joke's name is too short. Min 3 characters"
  }
}

function validateJokeContent(content: string) {
  if (content.length < 11) {
    return "That joke's content is too short. Min 10 characters"
  }
}

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData()
  const userId = await requireUserId(request)
  const name = form.get('name')
  const content = form.get('content')
  if (typeof name !== 'string' || typeof content !== 'string') {
    return badRequest({
      formError: 'Form not sumitted correctly. Name and Content are required.',
    })
  }
  const fieldErrors = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  }

  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields: { name, content } })
  }

  const joke = await db.joke.create({
    data: { name, content, jokesterId: userId },
  })
  return redirect(`/jokes/${joke.id}`)
}

export default function NewJokeRoute() {
  const actionData = useActionData<ActionData>()
  const transistion = useTransition()

  if (transistion.submission) {
    const name = transistion.submission.formData.get('name')
    const content = transistion.submission.formData.get('content')
    if (
      typeof name === 'string' &&
      typeof content === 'string' &&
      !validateJokeContent(content) &&
      !validateJokeName(name)
    ) {
      return (
        <JokeDisplay
          joke={{ name, content }}
          isOwner={true}
          canDelete={false}
        />
      )
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method='post'>
        <div>
          <label>
            Name:{' '}
            <input
              type='text'
              name='name'
              defaultValue={actionData?.fields?.name}
              aria-invalid={Boolean(actionData?.fieldErrors?.name || undefined)}
              aria-describedby={
                actionData?.fieldErrors?.name ? 'name-error' : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.name ? (
            <p className='form-validation-error' role='alert' id='name-error'>
              {actionData.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label>
            Content:{' '}
            <textarea
              id='content'
              name='content'
              defaultValue={actionData?.fields?.content}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.content) || undefined
              }
              aria-describedby={
                actionData?.fieldErrors?.content ? 'content-error' : undefined
              }
            ></textarea>
          </label>
          {actionData?.fieldErrors?.content ? (
            <p
              className='form-validation-error'
              role='alert'
              id='content-error'
            >
              {actionData?.fieldErrors?.content}
            </p>
          ) : null}
        </div>
        <div>
          <button type='submit' className='button'>
            Add
          </button>
        </div>
      </Form>
    </div>
  )
}

export function CatchBoundary() {
  const caught = useCatch()

  if (caught.status === 401) {
    return (
      <div className='error-container'>
        <p>You must be logged in to create a joke.</p>
        <Link to='/login'>Login</Link>
      </div>
    )
  }
}

export function ErrorBoundary() {
  return (
    <div className='error-container'>
      Something unexpected went wrong. Sorry about that.
    </div>
  )
}
