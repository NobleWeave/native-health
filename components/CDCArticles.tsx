
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getCDCArticles,
  type CDCArticle,
} from "../services/cdc";

function formatDate(value?: string) {
  if (!value) return "CDC health resource";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "CDC health resource";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CDCArticles() {
  const [articles, setArticles] = useState<CDCArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const result = await getCDCArticles();
      setArticles(result);
    } catch (err) {
      console.error("Failed to load CDC articles:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const openArticle = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error("Could not open CDC article:", err);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headingWrap}>
          <Text style={styles.eyebrow}>FROM THE CDC</Text>
          <Text style={styles.heading}>
            Health & wellness
          </Text>
        </View>

        <Text style={styles.source}>
          Trusted health info
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color="#285C3B" />
          <Text style={styles.stateText}>
            Loading health articles…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>
            Health articles are temporarily unavailable.
          </Text>

          <Pressable
            onPress={() => void loadArticles()}
            accessibilityRole="button"
          >
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>
            No health articles are available right now.
          </Text>
        </View>
      ) : (
        articles.map((article) => (
          <Pressable
            key={article.id}
            style={styles.articleCard}
            onPress={() => void openArticle(article.targetUrl)}
            accessibilityRole="link"
            accessibilityLabel={`Read ${article.name} on the CDC website`}
          >
            {article.thumbnailUrl ? (
              <Image
                source={{ uri: article.thumbnailUrl }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.thumbnail,
                  styles.imageFallback,
                ]}
              >
                <Text style={styles.fallbackIcon}>✚</Text>
              </View>
            )}

            <View style={styles.articleContent}>
              <Text
                style={styles.articleMeta}
                numberOfLines={1}
              >
                {article.topic || "HEALTH AWARENESS"}
                {" · "}
                {formatDate(article.datePublished)}
              </Text>

              <Text
                style={styles.articleTitle}
                numberOfLines={2}
              >
                {article.name}
              </Text>

              <Text
                style={styles.description}
                numberOfLines={3}
              >
                {article.description}
              </Text>

              <Text style={styles.readMore}>
                Read article ↗
              </Text>
            </View>
          </Pressable>
        ))
      )}

      <Text style={styles.disclaimer}>
        Content provided by the U.S. Centers for Disease
        Control and Prevention (CDC).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headingWrap: {
    flex: 1,
  },
  eyebrow: {
    color: "#718078",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heading: {
    color: "#17201B",
    fontSize: 20,
    fontWeight: "700",
  },
  source: {
    color: "#718078",
    fontSize: 11,
    marginBottom: 3,
  },
  articleCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumbnail: {
    width: 92,
    height: 104,
    borderRadius: 10,
    backgroundColor: "#E8EFE9",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackIcon: {
    fontSize: 30,
    color: "#285C3B",
    fontWeight: "700",
  },
  articleContent: {
    flex: 1,
    justifyContent: "center",
  },
  articleMeta: {
    fontSize: 9,
    color: "#52745C",
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  articleTitle: {
    color: "#17201B",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  description: {
    color: "#69736D",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  readMore: {
    color: "#285C3B",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 8,
  },
  stateCard: {
    minHeight: 88,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  stateText: {
    color: "#69736D",
    fontSize: 13,
    textAlign: "center",
  },
  retry: {
    color: "#285C3B",
    fontWeight: "700",
    padding: 4,
  },
  disclaimer: {
    color: "#8A948E",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 4,
  },
});
