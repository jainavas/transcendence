namespace PROJECT {
    export class AIDifficultyController extends TOOLKIT.ScriptComponent {
        
        // AI Difficulty levels configuration
        private aiDifficultyLevels: any = {
            easy: {
                name: 'Easy',
                updateInterval: 1500, // 1.5 seconds - slower
                difficulty: 0.6, // 60% accuracy
                reactionSpeed: 0.4, // 40% reaction speed
                maxMovementDuration: 1200, // Maximum 1.2 seconds of movement
                errorMultiplier: 0.5, // More error in predictions
                description: 'Slow and less accurate AI'
            },
            medium: {
                name: 'Medium',
                updateInterval: 1000, // 1 second - standard
                difficulty: 0.75, // 75% accuracy
                reactionSpeed: 0.6, // 60% reaction speed
                maxMovementDuration: 900, // Maximum 0.9 seconds of movement
                errorMultiplier: 0.35, // Moderate error
                description: 'Balanced AI'
            },
            hard: {
                name: 'Hard',
                updateInterval: 600, // 0.6 seconds - faster
                difficulty: 0.9, // 90% accuracy
                reactionSpeed: 0.85, // 85% reaction speed
                maxMovementDuration: 600, // Maximum 0.6 seconds of movement
                errorMultiplier: 0.2, // Less error
                description: 'Fast and precise AI'
            }
        };

        private currentDifficulty: string = 'medium';
        private aiPaddle: BABYLON.TransformNode = null;
        private ball: BABYLON.TransformNode = null;
        private lastUpdateTime: number = 0;
        private targetZ: number = 0;
        private isMoving: boolean = false;
        private movementStartTime: number = 0;
        private movementDuration: number = 0;
        private isAIEnabled: boolean = true;

        constructor(transform: BABYLON.TransformNode, scene: BABYLON.Scene, properties?: any) {
            super(transform, scene, properties, "PROJECT.AIDifficultyController");
        }

        protected awake(): void {
            // Initialize AI system
            this.findGameObjects();
            this.setupInputHandlers();
            console.log("🤖 AI Difficulty Controller initialized with difficulty:", this.currentDifficulty);
        }

        protected start(): void {
            // Setup initial difficulty settings
            this.applyDifficultySettings();
            this.updateDifficultyIndicator();
        }

        protected update(): void {
            if (!this.aiPaddle || !this.ball || !this.isAIEnabled) return;

            const currentTime: number = Date.now();
            const settings: any = this.getCurrentDifficultySettings();

            // AI decision making based on current difficulty
            if (currentTime - this.lastUpdateTime > settings.updateInterval) {
                this.makeAIDecision(currentTime, settings);
                this.lastUpdateTime = currentTime;
            }

            // Execute AI movement
            this.executeAIMovement(currentTime, settings);
        }

        private findGameObjects(): void {
            // Find AI paddle and ball in the scene
            this.aiPaddle = this.scene.getNodeByName("pala2");
            this.ball = this.scene.getNodeByName("bola");
            
            if (!this.aiPaddle) {
                console.warn("🤖 AI Paddle not found in scene");
            }
            if (!this.ball) {
                console.warn("🤖 Ball not found in scene");
            }
        }

        private setupInputHandlers(): void {
            // Setup keyboard input for difficulty changes with number keys 1, 2, 3
            TOOLKIT.InputController.OnKeyboardPress(TOOLKIT.UserInputKey.Num1, () => {
                this.setDifficulty('easy');
            });

            TOOLKIT.InputController.OnKeyboardPress(TOOLKIT.UserInputKey.Num2, () => {
                this.setDifficulty('medium');
            });

            TOOLKIT.InputController.OnKeyboardPress(TOOLKIT.UserInputKey.Num3, () => {
                this.setDifficulty('hard');
            });

            TOOLKIT.InputController.OnKeyboardPress(TOOLKIT.UserInputKey.T, () => {
                this.toggleAI();
            });
        }

        private getCurrentDifficultySettings(): any {
            return this.aiDifficultyLevels[this.currentDifficulty];
        }

        private toggleAI(): void {
            this.isAIEnabled = !this.isAIEnabled;
            console.log("🤖 AI toggled:", this.isAIEnabled ? "ON" : "OFF");
            this.updateDifficultyIndicator();
        }

        private applyDifficultySettings(): void {
            const settings: any = this.getCurrentDifficultySettings();
            
            // Reset AI state when difficulty changes
            this.isMoving = false;
            this.lastUpdateTime = 0;
            
            console.log(`🤖 Applied difficulty settings:`, {
                interval: settings.updateInterval + 'ms',
                precision: (settings.difficulty * 100) + '%',
                speed: (settings.reactionSpeed * 100) + '%'
            });
        }

        private makeAIDecision(currentTime: number, settings: any): void {
            if (!this.ball || !this.aiPaddle) return;

            // Get ball physics body for velocity calculation
            const ballPhysics: BABYLON.PhysicsBody = this.ball.physicsBody;
            if (!ballPhysics) return;

            const ballVelocity: BABYLON.Vector3 = ballPhysics.getLinearVelocity();
            const ballPosition: BABYLON.Vector3 = this.ball.position;
            const paddlePosition: BABYLON.Vector3 = this.aiPaddle.position;

            // Only react if ball is moving towards AI paddle
            if (ballVelocity && ballVelocity.length() > 0.1 && ballVelocity.x > 0) {
                // Predict ball position when it reaches paddle
                let predictedZ: number = ballPosition.z;
                const timeToReach: number = Math.abs((paddlePosition.x - ballPosition.x) / ballVelocity.x);
                predictedZ = ballPosition.z + (ballVelocity.z * timeToReach);

                // Add inaccuracy based on difficulty
                const baseError: number = (1 - settings.difficulty) * (Math.random() - 0.5) * 0.4;
                const adjustedError: number = baseError * settings.errorMultiplier;
                this.targetZ = predictedZ + adjustedError;

                // Limit target to playable area
                const paddleZLimit: number = 0.49; // Match the original limit
                this.targetZ = Math.max(-paddleZLimit, Math.min(paddleZLimit, this.targetZ));

                // Calculate movement duration
                const distance: number = Math.abs(this.targetZ - paddlePosition.z);
                const paddleSpeed: number = 0.014; // Match original speed
                const baseMovementTime: number = (distance / paddleSpeed) * (2 - settings.reactionSpeed) * 16.67;

                // Start movement if target is significantly different
                if (distance > paddleSpeed * 2) {
                    this.isMoving = true;
                    this.movementStartTime = currentTime;
                    this.movementDuration = Math.min(baseMovementTime, settings.maxMovementDuration);
                    
                    console.log(`AI (${settings.name}) moving to ${this.targetZ.toFixed(2)}, duration: ${this.movementDuration}ms`);
                } else {
                    this.isMoving = false;
                }
            } else {
                this.isMoving = false;
            }
        }

        private executeAIMovement(currentTime: number, settings: any): void {
            if (!this.aiPaddle || !this.isMoving) return;

            // Check if movement time has expired
            if ((currentTime - this.movementStartTime) >= this.movementDuration) {
                this.isMoving = false;
                return;
            }

            const paddlePosition: BABYLON.Vector3 = this.aiPaddle.position;
            const paddleDiff: number = this.targetZ - paddlePosition.z;
            const threshold: number = 0.007; // Movement threshold
            const paddleSpeed: number = 0.014;

            // Move paddle towards target
            if (Math.abs(paddleDiff) > threshold) {
                const moveDirection: number = paddleDiff > 0 ? 1 : -1;
                const newZ: number = paddlePosition.z + (moveDirection * paddleSpeed);
                
                // Apply movement limits
                const paddleZLimit: number = 0.49;
                const clampedZ: number = Math.max(-paddleZLimit, Math.min(paddleZLimit, newZ));
                
                this.aiPaddle.position.z = clampedZ;
                
                // Update physics if available
                if (this.aiPaddle.physicsBody) {
                    this.aiPaddle.physicsBody.setDeltaPosition(this.aiPaddle.position);
                }
            } else {
                // Close enough to target
                this.isMoving = false;
            }
        }

        private updateDifficultyIndicator(): void {
            // Update UI indicator (would need HTML element reference)
            const settings: any = this.getCurrentDifficultySettings();
            const status: string = this.isAIEnabled ? "ON" : "OFF";
            console.log(`🎯 AI ${status} - Difficulty: ${settings.name}`);
            
            // In a real implementation, this would update an HTML element
            // const indicator = document.getElementById('aiIndicator');
            // if (indicator) {
            //     indicator.textContent = `AI: ${status} - ${settings.name}`;
            //     indicator.style.backgroundColor = this.isAIEnabled ? 
            //         (this.currentDifficulty === 'easy' ? '#4CAF50' : 
            //          this.currentDifficulty === 'medium' ? '#FF9800' : '#F44336') : '#666';
            // }
        }

        public getDifficultyName(): string {
            return this.getCurrentDifficultySettings().name;
        }

        public getDifficultyDescription(): string {
            return this.getCurrentDifficultySettings().description;
        }

        public setDifficulty(difficulty: string): void {
            if (this.aiDifficultyLevels[difficulty]) {
                this.currentDifficulty = difficulty;
                this.applyDifficultySettings();
                this.updateDifficultyIndicator();
                console.log(`🎯 Difficulty set to: ${this.getCurrentDifficultySettings().name}`);
            }
        }

        public getIsAIEnabled(): boolean {
            return this.isAIEnabled;
        }

        public setAIEnabled(enabled: boolean): void {
            this.isAIEnabled = enabled;
            this.updateDifficultyIndicator();
        }
    }
}

// Pseudocode generated by codewrx.ai