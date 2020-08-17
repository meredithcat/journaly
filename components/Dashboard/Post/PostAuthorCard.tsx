import React from 'react'
import Link from 'next/link'
import theme from '../../../theme'
import {
  AuthorWithLanguagesFragmentFragment as Author,
  LanguageNative as LanguageNativeType,
  LanguageLearning as LanguageLearningType,
} from '../../../generated/graphql'
import BlankAvatarIcon from '../../Icons/BlankAvatarIcon'
import { languageNameWithDialect } from '../../../utils/languages'

type PostAuthorCardProps = {
  author: Author | any
}

const PostAuthorCard: React.FC<PostAuthorCardProps> = ({ author }) => {
  let languagesNative: LanguageNativeType[] = []
  let languagesLearning: LanguageLearningType[] = []

  for (let language of author.languagesLearning) {
    languagesLearning.push(language)
  }
  for (let language of author.languagesNative) {
    languagesNative.push(language)
  }

  return (
    <div className="container">
      <div className="author-info-container">
        <Link href={`/dashboard/profile/${author.id}`}>
          <a className="author-info">
            {author.profileImage ? (
              <img src={author.profileImage} alt="" />
            ) : (
              <BlankAvatarIcon size={60} />
            )}
          </a>
        </Link>
        <p className="author-name">{author.handle}</p>
      </div>
      <div className="language-info">
        <p className="author-info-heading">Native</p>
        <ul className="language-list">
          {languagesNative.map(({ language }) => {
            return <li key={language.id}>{languageNameWithDialect(language)}</li>
          })}
        </ul>
        <p className="author-info-heading">Learning</p>
        <ul className="language-list">
          {languagesLearning.map(({ language }) => {
            return <li key={language.id}>{languageNameWithDialect(language)}</li>
          })}
        </ul>
      </div>
      <div className="stats">
        <p className="author-info-heading">Has written</p>
        <ul>
          <li>10 posts</li>
        </ul>
        <p className="author-info-heading">Has received</p>
        <ul>
          <li>64 thanks</li>
        </ul>
      </div>
      <style jsx>{`
        .container {
          background-color: ${theme.colors.white};
          box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.09);
          width: 100%;
          height: 100%;
          padding: 20px;
          margin-bottom: 25px;
        }

        @media (min-width: ${theme.breakpoints.XS}) {
          .container {
            width: 38%;
            margin-bottom: 0;
          }
        }

        .author-info-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 10px;
          margin-bottom: 5px;
          border-bottom: 1px solid ${theme.colors.gray400};
          font-weight: 600;
        }

        .author-info img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }

        .author-info :global(svg) {
          border-radius: 50%;
          background-color: ${theme.colors.blueLight};
        }

        .author-info-heading {
          font-size: 11px;
          text-transform: uppercase;
          line-height: 1;
          font-weight: 600;
          margin-top: 10px;
        }

        .language-info {
          padding-bottom: 8px;
          border-bottom: 1px solid ${theme.colors.gray400};
        }

        .language-list li {
          display: inline-block;
          margin-right: 8px;
        }
      `}</style>
    </div>
  )
}

export default PostAuthorCard