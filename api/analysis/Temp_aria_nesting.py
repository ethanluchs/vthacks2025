import os
import re
import json
import glob
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

class ImageAltAnalyzer:
    def __init__(self):
        self.total_images = 0
        self.images_without_alt = 0
        self.file_results = []
        self.missing_alt_images = []

    def analyze_html_content(self, content, filename, file_path):
        """Analyze HTML content for img tags and their alt attributes"""
        try:
            lines = content.split('\n')
            soup = BeautifulSoup(content, 'html.parser')
            img_tags = soup.find_all('img')
            
            file_total = len(img_tags)
            file_without_alt = 0
            missing_images = []
            
            for img in img_tags:
                alt_attr = img.get('alt')
                # Consider empty alt="" as having alt (valid for decorative images)
                # Only count as missing if alt attribute is completely absent
                if alt_attr is None:
                    file_without_alt += 1
                    
                    # Get line context for the image
                    img_html = str(img)
                    line_context = self.find_element_line_context(content, img_html)
                    
                    missing_images.append({
                        'img_html': img_html,
                        'context': line_context,
                        'src': img.get('src', 'No src attribute')
                    })
            
            self.total_images += file_total
            self.images_without_alt += file_without_alt
            
            # Store results for this file
            file_result = {
                'filename': filename,
                'file_path': file_path,
                'total_images': file_total,
                'images_without_alt': file_without_alt,
                'percentage_without_alt': (file_without_alt / file_total * 100) if file_total > 0 else 0,
                'missing_images': missing_images
            }
            
            self.file_results.append(file_result)
            
            # Add to global missing images list
            for img_info in missing_images:
                self.missing_alt_images.append({
                    'filename': filename,
                    'file_path': file_path,
                    'img_html': img_info['img_html'],
                    'context': img_info['context'],
                    'src': img_info['src']
                })
            
        except Exception as e:
            print(f"Error parsing {filename}: {e}")

    def find_element_line_context(self, content, element_html):
        """Find the line context for an HTML element"""
        lines = content.split('\n')
        element_clean = ' '.join(element_html.split())
        
        for i, line in enumerate(lines):
            line_clean = ' '.join(line.split())
            if element_clean in line_clean:
                return f"Line {i+1}: {line.strip()}"
        
        return f"Element: {element_html}"

    def analyze_directory(self, directory_path):
        """Analyze all HTML files in a directory for image alt tags"""
        html_files = glob.glob(os.path.join(directory_path, "*.html"))
        
        for html_file in html_files:
            filename = os.path.basename(html_file)
            try:
                with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                self.analyze_html_content(content, filename, html_file)
            except Exception as e:
                print(f"Error reading {html_file}: {e}")

    def get_results_dict(self, directory_path):
        """Return results in a dictionary format similar to other analyzers"""
        return {
            "analysis_date": datetime.now().isoformat(),
            "directory": directory_path,
            "summary": {
                "total_files_analyzed": len(self.file_results),
                "total_files_with_issues": len([f for f in self.file_results if f["images_without_alt"] > 0]),
                "total_images": self.total_images,
                "total_images_without_alt": self.images_without_alt,
                "overall_percentage_without_alt": round((self.images_without_alt / self.total_images * 100) if self.total_images > 0 else 0, 1)
            },
            "files": self.file_results,
            "missing_alt_images": self.missing_alt_images
        }

def run_image_alt_analysis(directory_path="."):
    """Run image alt analysis and return results"""
    analyzer = ImageAltAnalyzer()
    analyzer.analyze_directory(directory_path)
    return analyzer.get_results_dict(directory_path)

def combine_all_analysis_results(aria_results, nesting_results, image_alt_results, output_filename="complete_analysis.json"):
    """
    Combine ARIA, nesting, and image alt analysis results into a comprehensive JSON file
    """
    
    # Create comprehensive combined results structure
    combined_results = {
        "analysis_date": datetime.now().isoformat(),
        "analysis_type": "Complete Website Analysis (Accessibility, Code Quality & Image Alt Tags)",
        "directory": aria_results.get("directory", "."),
        "summary": {
            "accessibility": {},
            "code_quality": {},
            "image_accessibility": {},
            "overall": {}
        },
        "files": {},
        "issues": {
            "aria_issues": [],
            "nesting_issues": [],
            "image_alt_issues": [],
            "all_issues": []
        }
    }
    
    # Extract ARIA summary
    if "summary" in aria_results:
        combined_results["summary"]["accessibility"] = {
            "total_interactive_elements": aria_results["summary"].get("total_interactive_elements", 0),
            "total_elements_without_aria": aria_results["summary"].get("total_elements_without_aria", 0),
            "overall_percentage_without_aria": aria_results["summary"].get("overall_percentage_without_aria", 0),
            "missing_by_element_type": aria_results["summary"].get("missing_by_element_type", {}),
            "files_with_aria_issues": aria_results["summary"].get("total_files_with_issues", 0)
        }
    
    # Extract nesting summary
    if "summary" in nesting_results:
        combined_results["summary"]["code_quality"] = {
            "total_nesting_issues": nesting_results["summary"].get("total_issues_found", 0),
            "issues_by_type": nesting_results["summary"].get("issues_by_type", {}),
            "files_with_nesting_issues": nesting_results["summary"].get("total_files_with_issues", 0)
        }
    
    # Extract image alt summary
    if "summary" in image_alt_results:
        combined_results["summary"]["image_accessibility"] = {
            "total_images": image_alt_results["summary"].get("total_images", 0),
            "total_images_without_alt": image_alt_results["summary"].get("total_images_without_alt", 0),
            "overall_percentage_without_alt": image_alt_results["summary"].get("overall_percentage_without_alt", 0),
            "files_with_image_issues": image_alt_results["summary"].get("total_files_with_issues", 0)
        }
    
    # Calculate overall summary
    total_files_analyzed = max(
        aria_results["summary"].get("total_files_analyzed", 0),
        nesting_results["summary"].get("total_files_analyzed", 0),
        image_alt_results["summary"].get("total_files_analyzed", 0)
    )
    
    total_issues = (
        combined_results["summary"]["accessibility"].get("total_elements_without_aria", 0) +
        combined_results["summary"]["code_quality"].get("total_nesting_issues", 0) +
        combined_results["summary"]["image_accessibility"].get("total_images_without_alt", 0)
    )
    
    files_with_any_issues = set()
    if "files" in aria_results:
        files_with_any_issues.update([f["filename"] for f in aria_results["files"] if f.get("elements_without_aria", 0) > 0])
    if "files" in nesting_results:
        files_with_any_issues.update([f["filename"] for f in nesting_results["files"] if f.get("issues_count", 0) > 0])
    if "files" in image_alt_results:
        files_with_any_issues.update([f["filename"] for f in image_alt_results["files"] if f.get("images_without_alt", 0) > 0])
    
    # Calculate accessibility scores
    aria_score = 100 - combined_results["summary"]["accessibility"].get("overall_percentage_without_aria", 0)
    image_score = 100 - combined_results["summary"]["image_accessibility"].get("overall_percentage_without_alt", 0)
    overall_accessibility_score = (aria_score + image_score) / 2
    
    combined_results["summary"]["overall"] = {
        "total_files_analyzed": total_files_analyzed,
        "total_files_with_issues": len(files_with_any_issues),
        "total_issues_found": total_issues,
        "accessibility_score": round(overall_accessibility_score, 1),
        "aria_accessibility_score": round(aria_score, 1),
        "image_accessibility_score": round(image_score, 1)
    }
    
    # Combine file-level data
    all_files = {}
    
    # Process ARIA files
    if "files" in aria_results:
        for file_info in aria_results["files"]:
            filename = file_info["filename"]
            all_files[filename] = {
                "filename": filename,
                "file_path": file_info.get("file_path", ""),
                "file_type": os.path.splitext(filename)[1].lower(),
                "accessibility": {
                    "total_interactive_elements": file_info.get("total_interactive_elements", 0),
                    "elements_without_aria": file_info.get("elements_without_aria", 0),
                    "percentage_without_aria": file_info.get("percentage_without_aria", 0),
                    "missing_by_type": file_info.get("missing_by_type", {}),
                    "missing_elements": file_info.get("missing_elements", [])
                },
                "code_quality": {
                    "nesting_issues_count": 0,
                    "nesting_issues": []
                },
                "image_accessibility": {
                    "total_images": 0,
                    "images_without_alt": 0,
                    "percentage_without_alt": 0,
                    "missing_images": []
                }
            }
    
    # Process nesting files
    if "files" in nesting_results:
        for file_info in nesting_results["files"]:
            filename = file_info["filename"]
            if filename not in all_files:
                all_files[filename] = {
                    "filename": filename,
                    "file_path": file_info.get("file_path", ""),
                    "file_type": file_info.get("file_type", ""),
                    "accessibility": {
                        "total_interactive_elements": 0,
                        "elements_without_aria": 0,
                        "percentage_without_aria": 0,
                        "missing_by_type": {},
                        "missing_elements": []
                    },
                    "code_quality": {
                        "nesting_issues_count": 0,
                        "nesting_issues": []
                    },
                    "image_accessibility": {
                        "total_images": 0,
                        "images_without_alt": 0,
                        "percentage_without_alt": 0,
                        "missing_images": []
                    }
                }
            
            all_files[filename]["code_quality"] = {
                "nesting_issues_count": file_info.get("issues_count", 0),
                "nesting_issues": file_info.get("issues", [])
            }
    
    # Process image alt files
    if "files" in image_alt_results:
        for file_info in image_alt_results["files"]:
            filename = file_info["filename"]
            if filename not in all_files:
                all_files[filename] = {
                    "filename": filename,
                    "file_path": file_info.get("file_path", ""),
                    "file_type": os.path.splitext(filename)[1].lower(),
                    "accessibility": {
                        "total_interactive_elements": 0,
                        "elements_without_aria": 0,
                        "percentage_without_aria": 0,
                        "missing_by_type": {},
                        "missing_elements": []
                    },
                    "code_quality": {
                        "nesting_issues_count": 0,
                        "nesting_issues": []
                    },
                    "image_accessibility": {
                        "total_images": 0,
                        "images_without_alt": 0,
                        "percentage_without_alt": 0,
                        "missing_images": []
                    }
                }
            
            all_files[filename]["image_accessibility"] = {
                "total_images": file_info.get("total_images", 0),
                "images_without_alt": file_info.get("images_without_alt", 0),
                "percentage_without_alt": file_info.get("percentage_without_alt", 0),
                "missing_images": file_info.get("missing_images", [])
            }
    
    combined_results["files"] = list(all_files.values())
    
    # Combine all issues
    if "missing_aria_elements" in aria_results:
        combined_results["issues"]["aria_issues"] = aria_results["missing_aria_elements"]
        
        for aria_issue in aria_results["missing_aria_elements"]:
            combined_results["issues"]["all_issues"].append({
                "category": "accessibility",
                "subcategory": "aria_labels",
                "type": "missing_aria_label",
                "filename": aria_issue["filename"],
                "file_path": aria_issue["file_path"],
                "element_type": aria_issue["element_type"],
                "context": aria_issue["context"],
                "element_html": aria_issue["element_html"],
                "severity": "medium"
            })
    
    if "issues" in nesting_results:
        combined_results["issues"]["nesting_issues"] = nesting_results["issues"]
        
        for nesting_issue in nesting_results["issues"]:
            severity = "high" if "UNMATCHED" in nesting_issue["type"] else "medium"
            combined_results["issues"]["all_issues"].append({
                "category": "code_quality",
                "subcategory": "nesting",
                "type": nesting_issue["type"],
                "filename": nesting_issue["filename"],
                "file_path": nesting_issue["file_path"],
                "line": nesting_issue["line"],
                "message": nesting_issue["message"],
                "code": nesting_issue["code"],
                "severity": severity
            })
    
    if "missing_alt_images" in image_alt_results:
        combined_results["issues"]["image_alt_issues"] = image_alt_results["missing_alt_images"]
        
        for image_issue in image_alt_results["missing_alt_images"]:
            combined_results["issues"]["all_issues"].append({
                "category": "accessibility",
                "subcategory": "image_alt_tags",
                "type": "missing_alt_attribute",
                "filename": image_issue["filename"],
                "file_path": image_issue["file_path"],
                "context": image_issue["context"],
                "img_html": image_issue["img_html"],
                "src": image_issue["src"],
                "severity": "medium"
            })
    
    # Sort all issues by filename and line number
    combined_results["issues"]["all_issues"].sort(key=lambda x: (x["filename"], x.get("line", 0)))
    
    # Save to JSON file
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(combined_results, f, indent=2, ensure_ascii=False)
    
    return combined_results

def complete_website_analysis(directory_path=".", output_filename="complete_website_analysis.json"):
    """
    Main function that runs ARIA, nesting, and image alt analysis and combines results into JSON
    """
    print("🔍 Starting Complete Website Analysis...")
    print("=" * 80)
    
    try:
        # Run ARIA analysis
        print("📋 Running ARIA label analysis...")
        aria_results = analyze_directory(directory_path, output_json=True, json_filename="temp_aria.json")
        
        # Run nesting analysis  
        print("🔍 Running nesting analysis...")
        nesting_results = analyze_nesting_issues(directory_path, output_json=True, json_filename="temp_nesting.json")
        
        # Run image alt analysis
        print("🖼️  Running image alt tag analysis...")
        image_alt_results = run_image_alt_analysis(directory_path)
        
        # Combine all results
        print("🔄 Combining all results...")
        combined_results = combine_all_analysis_results(
            aria_results, nesting_results, image_alt_results, output_filename
        )
        
        # Clean up temporary files
        for temp_file in ["temp_aria.json", "temp_nesting.json"]:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Print comprehensive summary
        print(f"\n✅ Complete website analysis finished!")
        print(f"📄 Results saved to: {output_filename}")
        print(f"📊 COMPREHENSIVE SUMMARY:")
        print(f"   - Files analyzed: {combined_results['summary']['overall']['total_files_analyzed']}")
        print(f"   - Files with issues: {combined_results['summary']['overall']['total_files_with_issues']}")
        print(f"   - Total issues found: {combined_results['summary']['overall']['total_issues_found']}")
        
        print(f"\n🎯 ACCESSIBILITY SCORES:")
        print(f"   - Overall accessibility: {combined_results['summary']['overall']['accessibility_score']}%")
        print(f"   - ARIA labels: {combined_results['summary']['overall']['aria_accessibility_score']}%")
        print(f"   - Image alt tags: {combined_results['summary']['overall']['image_accessibility_score']}%")
        
        # Show breakdown
        aria_issues = len(combined_results['issues']['aria_issues'])
        nesting_issues = len(combined_results['issues']['nesting_issues'])
        image_issues = len(combined_results['issues']['image_alt_issues'])
        
        print(f"\n📋 ISSUE BREAKDOWN:")
        print(f"   - ARIA label issues: {aria_issues}")
        print(f"   - Nesting issues: {nesting_issues}")
        print(f"   - Image alt tag issues: {image_issues}")
        
        return combined_results
        
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        return None

# Example usage
if __name__ == "__main__":
    # Run complete website analysis
    results = complete_website_analysis(".", "my_complete_website_analysis.json")
    
    # You can also specify custom directory and filename
    # results = complete_website_analysis("/path/to/your/website", "custom_analysis.json")
    
    # Access specific data from results
    if results:
        print(f"\n🏆 TOP ISSUES:")
        
        # Find file with most accessibility issues
        worst_aria = max(results["files"], key=lambda x: x["accessibility"]["percentage_without_aria"])
        worst_images = max(results["files"], key=lambda x: x["image_accessibility"]["percentage_without_alt"])
        
        print(f"   Worst ARIA accessibility: {worst_aria['filename']} ({worst_aria['accessibility']['percentage_without_aria']}%)")
        print(f"   Worst image accessibility: {worst_images['filename']} ({worst_images['image_accessibility']['percentage_without_alt']}%)")