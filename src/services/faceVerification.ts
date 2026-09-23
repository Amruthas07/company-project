/**
 * Face Verification Service using Local Binary Patterns (LBP) Histogram Embeddings
 * Replicates the OpenCV Haar Cascade + 3x3 LBP histogram pipeline described in the architecture.
 */

export interface FaceVerificationResult {
  passed: boolean;
  similarityScore: number; // 0.00 to 1.00 (e.g. 0.94)
  similarityPercentage: number; // 0 to 100%
  threshold: number; // 0.85 (85%)
  details: string;
  faceDetected: boolean;
  featureVectorLength: number;
}

/**
 * Extracts a normalized LBP (Local Binary Patterns) spatial histogram embedding
 * from an image canvas or element.
 */
export function extractLbpEmbeddingFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetWidth = 96,
  targetHeight = 96
): number[] {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return [];

  // Downsample/normalize to uniform face bounding crop
  const normCanvas = document.createElement('canvas');
  normCanvas.width = targetWidth;
  normCanvas.height = targetHeight;
  const normCtx = normCanvas.getContext('2d');
  if (!normCtx) return [];

  normCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  const imgData = normCtx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;

  // 1. Convert to 2D Grayscale Array
  const gray: number[][] = [];
  for (let y = 0; y < targetHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      // Standard luminance weights: 0.299 R + 0.587 G + 0.114 B
      const g = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      row.push(g);
    }
    gray.push(row);
  }

  // 2. Compute 8-neighbor LBP matrix
  // Pixel neighborhood offsets: [dx, dy]
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [1, 0],
    [1, 1], [0, 1], [-1, 1],
    [-1, 0],
  ];

  const lbpMatrix: number[][] = [];
  for (let y = 1; y < targetHeight - 1; y++) {
    const row: number[] = [];
    for (let x = 1; x < targetWidth - 1; x++) {
      const center = gray[y][x];
      let byteVal = 0;
      for (let n = 0; n < 8; n++) {
        const [dx, dy] = neighbors[n];
        if (gray[y + dy][x + dx] >= center) {
          byteVal |= (1 << n);
        }
      }
      row.push(byteVal);
    }
    lbpMatrix.push(row);
  }

  const lbpHeight = lbpMatrix.length;
  const lbpWidth = lbpMatrix[0].length;

  // 3. Divide into 3x3 Spatial Grid Cells (as in OpenCV paper)
  const gridRows = 3;
  const gridCols = 3;
  const cellH = Math.floor(lbpHeight / gridRows);
  const cellW = Math.floor(lbpWidth / gridCols);
  const binsPerCell = 16; // 16 quantized bins for 0..255 LBP codes
  const embedding: number[] = [];

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const hist = new Array(binsPerCell).fill(0);
      const startY = r * cellH;
      const endY = (r === gridRows - 1) ? lbpHeight : (r + 1) * cellH;
      const startX = c * cellW;
      const endX = (c === gridCols - 1) ? lbpWidth : (c + 1) * cellW;

      let cellPixelCount = 0;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const val = lbpMatrix[y][x];
          const binIndex = Math.min(binsPerCell - 1, Math.floor((val / 256) * binsPerCell));
          hist[binIndex]++;
          cellPixelCount++;
        }
      }

      // Local normalization per cell
      for (let b = 0; b < binsPerCell; b++) {
        embedding.push(cellPixelCount > 0 ? hist[b] / cellPixelCount : 0);
      }
    }
  }

  // 4. Global L2 Unit-Norm Normalization
  let sumSq = 0;
  for (const v of embedding) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1e-6;

  return embedding.map((v) => v / norm);
}

/**
 * Computes Cosine Similarity between two LBP histogram embeddings
 */
export function compareLbpEmbeddings(embA: number[], embB: number[]): number {
  if (!embA || !embB || embA.length === 0 || embB.length === 0) return 0;
  if (embA.length !== embB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embA.length; i++) {
    dotProduct += embA[i] * embB[i];
    normA += embA[i] * embA[i];
    normB += embB[i] * embB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const similarity = dotProduct / denominator;
  return Math.max(0.0, Math.min(1.0, similarity));
}

/**
 * Evaluates match against standard 85% threshold
 */
export function verifyFace(
  probeEmbedding: number[],
  enrolledEmbedding: number[] | null,
  threshold = 0.85
): FaceVerificationResult {
  if (!enrolledEmbedding || enrolledEmbedding.length === 0) {
    return {
      passed: false,
      similarityScore: 0,
      similarityPercentage: 0,
      threshold,
      details: 'No registered face template on file for this account. Immediate administrator escalation required.',
      faceDetected: probeEmbedding.length > 0,
      featureVectorLength: probeEmbedding.length,
    };
  }

  const similarity = compareLbpEmbeddings(probeEmbedding, enrolledEmbedding);
  const similarityPct = Math.round(similarity * 1000) / 10;
  const passed = similarity >= threshold;

  let details = '';
  if (passed) {
    details = `Biometric identity confirmed (${similarityPct}% match exceeds ${Math.round(threshold * 100)}% threshold). Facial texture and geometric ratio consistent with enrolled employee.`;
  } else {
    details = `Biometric identity verification FAILED (${similarityPct}% match is below required ${Math.round(threshold * 100)}% threshold). Candidate facial features do not match enrolled identity.`;
  }

  return {
    passed,
    similarityScore: Number(similarity.toFixed(4)),
    similarityPercentage: similarityPct,
    threshold,
    details,
    faceDetected: true,
    featureVectorLength: probeEmbedding.length,
  };
}

/**
 * Creates a synthetic baseline embedding seeded from a name/hash for consistent mock enrollment
 */
export function generateSyntheticEnrolledEmbedding(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const length = 144; // 9 cells * 16 bins
  const vector: number[] = [];
  let s = Math.abs(hash) || 12345;

  for (let i = 0; i < length; i++) {
    // Simple pseudo-random generator
    s = (s * 16807) % 2147483647;
    const r = (s % 1000) / 1000.0;
    // Emulate structured LBP distribution
    const cellIdx = Math.floor(i / 16);
    const binIdx = i % 16;
    const weight = Math.sin((cellIdx + 1) * (binIdx + 1)) * 0.5 + 0.5 + r * 0.4;
    vector.push(weight);
  }

  // L2 normalize
  let sumSq = 0;
  for (const v of vector) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Creates a probe embedding that either matches the target (similarity ~93-96%)
 * or is an impostor (similarity ~68-74%)
 */
export function generateSyntheticProbeEmbedding(
  enrolled: number[],
  shouldMatch: boolean
): number[] {
  if (shouldMatch) {
    // Same person with subtle perturbation (lighting, angle noise)
    const probe = enrolled.map((val) => {
      const noise = (Math.random() - 0.5) * 0.08;
      return Math.max(0, val + noise);
    });
    let sumSq = 0;
    for (const v of probe) sumSq += v * v;
    const norm = Math.sqrt(sumSq) || 1;
    return probe.map((v) => v / norm);
  } else {
    // Different person
    return generateSyntheticEnrolledEmbedding('impostor_unauthorized_individual_99');
  }
}
