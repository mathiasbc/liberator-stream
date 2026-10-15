import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Flex, Image, Text } from '@chakra-ui/react';
import { palette, fonts } from '../theme/theme';
import {
  SIZES,
  fitPost,
  formatCount,
  postDuration,
  postWhen,
} from '../utils/posts';
import { SAMPLE_TWEETS } from '../data/sampleTweets';

const AVATAR_COLORS = [
  palette.cycle,
  palette.chain,
  palette.sats,
  palette.market,
  palette.up,
];

const XMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' aria-hidden>
    <path
      fill='currentColor'
      d='M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z'
    />
  </svg>
);

const ICONS = {
  reply: 'M4 5h16v11H10l-5 4v-4H4z',
  repost:
    'M17 3l3 3-3 3 M20 6H9a4 4 0 0 0-4 4v1 M7 21l-3-3 3-3 M4 18h11a4 4 0 0 0 4-4v-1',
  like: 'M12 20s-7.5-4.6-9.2-9C1.6 7.8 3.6 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.4 0 5.4 3.3 4.2 6.5C19.5 15.4 12 20 12 20z',
};

const Stat = ({ icon, value }) => (
  <Flex align='center' gap='8px' color={palette.mute}>
    <svg
      width='21'
      height='21'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d={ICONS[icon]} />
    </svg>
    <Text fontSize='19px' fontWeight='600'>
      {formatCount(value)}
    </Text>
  </Flex>
);

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const Avatar = ({ post, index, size }) => {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return post.avatarUrl ? (
    <Image
      src={post.avatarUrl}
      alt=''
      w={`${size}px`}
      h={`${size}px`}
      borderRadius='50%'
      border={`2px solid ${color}`}
      flex='none'
    />
  ) : (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      flex='none'
      borderRadius='50%'
      align='center'
      justify='center'
      bg={`${color}2E`}
      border={`2px solid ${color}`}
      color={palette.ink}
      fontFamily={fonts.display}
      fontWeight='700'
      fontSize={`${Math.round(size * 0.4)}px`}
    >
      {initials(post.name)}
    </Flex>
  );
};

// Cashtags, hashtags and mentions pick up the chain colour
const RichText = ({ text }) =>
  text.split(/([$#@][A-Za-z_]\w*)/g).map((part, i) =>
    /^[$#@][A-Za-z_]/.test(part) ? (
      <Text as='span' key={i} color={palette.chain}>
        {part}
      </Text>
    ) : (
      part
    )
  );

const SocialWire = ({ tweets }) => {
  const isSample = !tweets?.length;
  const posts = isSample ? SAMPLE_TWEETS : tweets;
  const [index, setIndex] = useState(0);

  const i = index % posts.length;
  const post = posts[i];
  const nextIndex = (i + 1) % posts.length;
  const next = posts[nextIndex];
  // Longer posts step down in size and stay up longer. The size starts from
  // an estimate; if the text still overflows once laid out, it steps down
  // again before the frame is painted, so nothing is ever clipped.
  const fitted = fitPost(post.text);
  const [shrink, setShrink] = useState({ id: null, steps: 0 });
  const steps = shrink.id === post.id ? shrink.steps : 0;
  const size = SIZES[Math.min(fitted.index + steps, SIZES.length - 1)];
  const duration = postDuration(fitted.text);
  const textRef = useRef(null);
  const bodyRef = useRef(null);

  useLayoutEffect(() => {
    const text = textRef.current;
    const body = bodyRef.current;
    if (!text || !body) return;
    const overflowing =
      text.scrollHeight > text.clientHeight + 1 ||
      body.scrollHeight > body.clientHeight + 1;
    if (overflowing && fitted.index + steps < SIZES.length - 1) {
      setShrink({ id: post.id, steps: steps + 1 });
    }
  }, [post.id, fitted.text, fitted.index, steps]);

  useEffect(() => {
    const id = setTimeout(
      () => setIndex((n) => (n + 1) % posts.length),
      duration
    );
    return () => clearTimeout(id);
  }, [i, duration, posts.length]);

  return (
    <Flex
      direction='column'
      flex='1'
      minH={0}
      bg={`linear-gradient(180deg, ${palette.card}, ${palette.panel})`}
      border={`1px solid ${palette.line}`}
      borderRadius='14px'
      overflow='hidden'
    >
      <Flex
        h='56px'
        flex='none'
        align='center'
        gap='12px'
        px='20px'
        borderBottom={`1px solid ${palette.line}`}
        fontFamily={fonts.display}
        whiteSpace='nowrap'
      >
        <Flex
          w='34px'
          h='34px'
          align='center'
          justify='center'
          bg={palette.ink}
          color={palette.stage}
          borderRadius='8px'
        >
          <XMark size={18} />
        </Flex>
        <Text fontSize='25px' fontWeight='800' letterSpacing='0.12em'>
          ON X
        </Text>
        <Text
          fontSize='17px'
          fontWeight='600'
          letterSpacing='0.18em'
          color={palette.dim}
        >
          SELECTED POSTS
        </Text>
        <Box flex='1' />
        {isSample && (
          <Text
            fontSize='15px'
            fontWeight='700'
            letterSpacing='0.16em'
            color={palette.sats}
            border={`1px solid ${palette.sats}`}
            px='8px'
            py='2px'
          >
            SAMPLE
          </Text>
        )}
        <Text fontFamily={fonts.mono} fontSize='17px' color={palette.mute}>
          {i + 1}/{posts.length}
        </Text>
      </Flex>

      <Flex
        key={post.id}
        ref={bodyRef}
        direction='column'
        flex='1'
        minH={0}
        overflow='hidden'
        px='22px'
        pt='20px'
        pb='16px'
        animation='postIn 0.6s ease-out'
      >
        <Flex align='center' gap='14px'>
          <Avatar post={post} index={i} size={58} />
          <Box minW={0}>
            <Text
              fontSize='23px'
              fontWeight='700'
              lineHeight='1.15'
              whiteSpace='nowrap'
              overflow='hidden'
              textOverflow='ellipsis'
            >
              {post.name}
            </Text>
            <Text fontSize='19px' color={palette.dim} lineHeight='1.3'>
              @{post.handle} · {postWhen(post)}
            </Text>
          </Box>
        </Flex>
        <Text
          ref={textRef}
          mt='16px'
          fontSize={size.fontSize}
          fontWeight='500'
          lineHeight={size.lineHeight}
          color={palette.ink}
          whiteSpace='pre-line'
          noOfLines={size.lines}
        >
          <RichText text={fitted.text} />
        </Text>
        <Box flex='1' />
        <Flex align='center' gap='26px' mt='12px' whiteSpace='nowrap'>
          {/* Counts X doesn't provide (reposts) are left out */}
          {typeof post.replies === 'number' && (
            <Stat icon='reply' value={post.replies} />
          )}
          {typeof post.reposts === 'number' && (
            <Stat icon='repost' value={post.reposts} />
          )}
          {typeof post.likes === 'number' && (
            <Stat icon='like' value={post.likes} />
          )}
          <Box flex='1' />
          {posts.length > 1 && (
            <Flex align='center' gap='8px' minW={0}>
              <Text
                fontFamily={fonts.display}
                fontSize='15px'
                fontWeight='600'
                letterSpacing='0.18em'
                color={palette.dim}
              >
                NEXT
              </Text>
              <Avatar post={next} index={nextIndex} size={26} />
              <Text
                fontSize='17px'
                fontWeight='600'
                color={palette.mute}
                maxW='120px'
                overflow='hidden'
                textOverflow='ellipsis'
              >
                {next.name}
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>

      <Box h='4px' flex='none' bg={palette.line}>
        <Box
          key={`progress-${post.id}`}
          h='100%'
          bg={palette.accent}
          animation={`progress ${duration}ms linear`}
        />
      </Box>
    </Flex>
  );
};

export default SocialWire;
