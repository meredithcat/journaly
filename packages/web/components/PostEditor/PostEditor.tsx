import React from 'react'
import { Editor, Descendant } from 'slate'

import FileInput from '@/components/FileInput'
import PostHeader from '@/components/PostHeader'
import JournalyEditor from '@/components/JournalyEditor'
import XIcon from '@/components/Icons/XIcon'
import Select from '@/components/Select'
import MultiSelect from '@/components/MultiSelect'
import { ButtonVariant } from '@/components/Button'
import theme from '@/theme'
import usePostImageUpload from '@/hooks/usePostImageUpload'
import useAutosavedState from '@/hooks/useAutosavedState'
import {
  CurrentUserFragmentFragment as UserType,
  TopicFragmentFragment as TopicType,
  LanguageFragmentFragment as LanguageType,
  PostStatus as PostStatusType,
  LanguageLevel,
} from '@/generated/graphql'
import { languageNameWithDialect } from '@/utils/languages'
import { useTranslation } from '@/config/i18n'

type BasePostData = {
  title: string
  language: LanguageType
  topicIds: number[]
  headlineImage: {
    smallSize: string
    largeSize: string
  }
  body: Descendant[]
}

type OutputPostData = BasePostData & {
  clear: () => void
  resetIntialPostValues: () => void
}

type InputPostData = BasePostData & {
  timestamp: number
}

type PostEditorProps = {
  currentUser: UserType,
  autosaveKey: string
  dataRef: React.MutableRefObject<OutputPostData | undefined>
  initialData: InputPostData
  topics: TopicType[]
  disabled?: boolean
}

type validatePostDataSignature = (
  data: OutputPostData,
  t: (arg0: string) => string,
) => [boolean, string]

const validatePostData: validatePostDataSignature = (data, t) => {
  if (!data.title.length) {
    return [false, t('emptyTitleError')]
  }

  if (data.language.id === -1) {
    return [false, t('noLanguageError')]
  }

  return [true, '']
}

const PostEditor: React.FC<PostEditorProps> = ({
  currentUser,
  autosaveKey,
  initialData,
  dataRef,
  topics,
  disabled,
}) => {
  const { t } = useTranslation('post')
  const slateRef = React.useRef<Editor>(null)

  const [lang, setLang, resetLang] = useAutosavedState<LanguageType>(initialData.language, {
    initialTimestamp: initialData.timestamp,
    key: `${autosaveKey}:langId`,
    debounceTime: 1000,
  })
  const [title, setTitle, resetTitle] = useAutosavedState<string>(initialData.title, {
    initialTimestamp: initialData.timestamp,
    key: `${autosaveKey}:title`,
    debounceTime: 1000,
  })
  const [body, setBody, resetBody] = useAutosavedState<Descendant[]>(initialData.body, {
    initialTimestamp: initialData.timestamp,
    key: `${autosaveKey}:body`,
    debounceTime: 1000,
  })

  let { languages = [] } = currentUser || {}
  const missingInitialLanguage = !languages.some(
    ({language}) => language.id === initialData.language.id
  )
  if (missingInitialLanguage && initialData.language.id != -1) {
    languages = [...languages, {
      level: LanguageLevel.Beginner,
      id: -1,
      language: initialData.language
    }]
  }
  const userLanguages = languages.map(({ language }) => {
    const value = language.id.toString()
    const displayName = languageNameWithDialect(language)

    return { value, displayName }
  })

  const [image, uploadingImage, onFileInputChange, resetImage] = usePostImageUpload()
  const postImage = image?.finalUrlLarge || initialData.headlineImage.largeSize

  const [selectedTopics, setSelectedTopics] = React.useState<number[]>(initialData.topicIds)
  const formattedTopicOptions = (topics || []).map(({ name, id }) => ({
    value: id,
    displayName: name || '',
  }))
  const addTopic = (id: number) => setSelectedTopics([...selectedTopics, id])
  const removeTopic = (id: number) => setSelectedTopics(selectedTopics.filter((tid) => tid !== id))

  const postLanguage = languages.find(({ language }) => language.id === lang.id)?.language
  const postTopics = topics.filter(({ id }) => selectedTopics.indexOf(id) > -1)

  const resetIntialPostValues = React.useCallback(() => {
    setTitle(initialData.title)
    setLang(initialData.language)
    setBody(initialData.body)
    setSelectedTopics(initialData.topicIds)
  }, [initialData])

  React.useEffect(() => {
    const clear = () => {
      if (!slateRef.current) {
        return
      }

      // Must clear any active selection before clearing content or the editor
      // will violently explode. See https://github.com/ianstormtaylor/slate/issues/3477
      slateRef.current.selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 },
      }

      resetTitle()
      resetBody()
      resetImage()
      resetLang()
    }

    const returnImage = !image ? {
        largeSize: initialData.headlineImage.largeSize,
        smallSize: initialData.headlineImage.smallSize,
      } : {
        largeSize: image.finalUrlLarge,
        smallSize: image.finalUrlSmall,
      }

    dataRef.current = {
      title,
      body,
      clear,
      headlineImage: returnImage,
      language: lang,
      topicIds: selectedTopics,
      resetIntialPostValues,
    }
  }, [title, lang, image, body, selectedTopics])

  return (
    <div className="post-editor">
      <label htmlFor="post-title" className="title-input">
        {t('titleLabel')}
      </label>
      <input
        className="j-field"
        id="post-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        type="text"
        name="title"
        placeholder={t('titlePlaceholder')}
        autoComplete="off"
        dir="auto"
        disabled={disabled}
        data-testid="post-title"
      />

      <label htmlFor="post-language">{t('languageLabel')}</label>
      <Select
        id="language"
        options={userLanguages}
        value={lang.id ? lang.id.toString() : ''}
        onChange={(value) => setLang({id: parseInt(value, 10), name: '', dialect: ''})}
        placeholder={
          userLanguages.length > 0
            ? t('languageSelectPlaceholder')
            : t('languageSelectSettingsPlaceholder')
        }
        disabled={disabled}
        dataTestId="post-language-select"
      />

      <label htmlFor="post-topics">{t('topicsLabel')}</label>
      <MultiSelect
        id="post-topics"
        options={formattedTopicOptions}
        selectedOptionValues={selectedTopics}
        onAdd={addTopic}
        onRemove={removeTopic}
        placeholder={t('topicSelectPlaceholder')}
        disabled={disabled || selectedTopics.length >= 5}
        dataTestId="post-topics-select"
      />

      <div className="header-preview-container">
        <PostHeader
          postTitle={title}
          postStatus={PostStatusType.Published}
          publishDate={new Date().toISOString()}
          authorName={currentUser?.name || 'anonymous'}
          postImage={postImage}
          language={postLanguage}
          topics={postTopics}
        >
          <div className="header-preview-options">
            <FileInput
              variant={ButtonVariant.Primary}
              className="image-upload-btn"
              loading={uploadingImage}
              onChange={onFileInputChange}
            >
              {t('uploadImageButtonText')}
            </FileInput>
            <XIcon
              className="cancel-image-icon"
              color={theme.colors.white}
              onClick={() => resetImage()}
            />
          </div>
        </PostHeader>
      </div>

      <div className="editor-padding">
        <JournalyEditor
          value={body}
          setValue={setBody}
          slateRef={slateRef}
          disabled={disabled}
          allowInlineImages={!!currentUser.membershipSubscription?.isActive}
        />
      </div>

      <style jsx>{`
        .post-editor {
          display: flex;
          flex-direction: column;
        }
        .editor-padding {
          padding: 25px 0;
        }

        .preview-image {
          flex: 0;
          align-self: center;
        }

        .header-preview-container {
          margin-top: 24px;
          opacity: ${disabled ? 0.6 : 'auto'};
        }

        .image-upload-input {
          display: none;
        }

        .header-preview-options {
          display: flex;
          flex-direction: row;
          align-items: center;
        }

        :global(.post-header .header-preview-options) {
          position: absolute;
          top: 10px;
          right: 10px;
        }

        :global(.post-header .image-upload-btn) {
          margin-right: 5px;
        }

        label {
          margin-top: 10px;
        }

        .title-input {
          margin-top: 0;
        }

        :global(.post-header .cancel-image-icon:hover) {
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

export type { InputPostData, OutputPostData }
export { validatePostData }
export default PostEditor
