from bs4 import BeautifulSoup
import os
import re
from pathlib import Path
import json
from datetime import datetime
import argparse
import glob

# Test for Aria Labels
def check_aria_labels(html_file_path):
    """
    Analyze HTML file and return percentage of elements without aria labels
    """
    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
        soup = BeautifulSoup(html_content, 'html.parser')
    
    # Elements that should typically have aria labels for accessibility
    interactive_elements = [
        'button', 'a', 'input', 'select', 'textarea', 
        'img', 'iframe', 'audio', 'video'
    ]
    
    # Find all interactive elements
    all_elements = []
    for tag in interactive_elements:
        all_elements.extend(soup.find_all(tag))
    
    if not all_elements:
        return 0, 0, 0, {}, []  # No elements found
    
    # Track elements without aria by type and their code
    missing_aria_by_type = {}
    elements_with_aria = 0
    elements_without_aria = 0
    missing_elements_code = []
    
    for element in all_elements:
        has_aria = (
            element.get('aria-label') or 
            element.get('aria-labelledby') or 
            element.get('aria-describedby') or
            # For images, alt text can serve as aria label
            (element.name == 'img' and element.get('alt'))
        )
        
        if has_aria:
            elements_with_aria += 1
        else:
            elements_without_aria += 1
            # Track the element type
            element_type = element.name
            missing_aria_by_type[element_type] = missing_aria_by_type.get(element_type, 0) + 1
            
            # Get the actual HTML code for this element
            element_html = str(element)
            # Get surrounding context (find the line in original HTML)
            line_context = get_element_line_context(html_content, element_html)
            
            missing_elements_code.append({
                'type': element_type,
                'html': element_html,
                'context': line_context
            })
    
    total_elements = len(all_elements)
    percentage_without_aria = (elements_without_aria / total_elements) * 100
    
    return percentage_without_aria, elements_without_aria, total_elements, missing_aria_by_type, missing_elements_code

def get_element_line_context(html_content, element_html):
    """
    Find the line context for an element in the original HTML
    """
    # Split HTML into lines
    lines = html_content.split('\n')
    
    # Clean up the element HTML for searching (remove extra whitespace)
    element_clean = ' '.join(element_html.split())
    
    # Search for the line containing this element
    for i, line in enumerate(lines):
        line_clean = ' '.join(line.split())
        if element_clean in line_clean:
            return f"Line {i+1}: {line.strip()}"
    
    # If not found in a single line, it might span multiple lines
    # Return the element HTML itself as fallback
    return f"Element: {element_html}"

def analyze_directory(directory_path=".", output_json=True, json_filename="aria_issues.json"):
    """
    Analyze all HTML files in a directory
    """
    import json
    from datetime import datetime
    
    html_files = glob.glob(os.path.join(directory_path, "*.html"))
    
    if not html_files:
        message = "No HTML files found in the directory"
        if not output_json:
            print(message)
        return {"error": message}
    
    total_elements_all_files = 0
    total_without_aria_all_files = 0
    overall_missing_by_type = {}
    all_missing_elements = []
    
    results = {
        "analysis_date": datetime.now().isoformat(),
        "directory": directory_path,
        "summary": {},
        "files": [],
        "missing_aria_elements": []
    }
    
    if not output_json:
        print("📋 ARIA Label Analysis Results")
        print("=" * 50)
    
    for html_file in html_files:
        percentage, without_aria, total, missing_by_type, missing_elements = check_aria_labels(html_file)
        filename = os.path.basename(html_file)
        
        file_result = {
            "filename": filename,
            "file_path": html_file,
            "total_interactive_elements": total,
            "elements_without_aria": without_aria,
            "percentage_without_aria": round(percentage, 1),
            "missing_by_type": missing_by_type,
            "missing_elements": missing_elements
        }
        
        if not output_json:
            print(f"\n📄 {filename}")
            print(f"   Total interactive elements: {total}")
            print(f"   Elements without aria labels: {without_aria}")
            print(f"   Percentage without aria: {percentage:.1f}%")
            
            # Show breakdown by element type for this file
            if missing_by_type:
                print(f"   Missing aria labels by type:")
                for element_type, count in missing_by_type.items():
                    print(f"     - {element_type}: {count}")
            
            # Show the actual code lines for missing elements
            if missing_elements:
                print(f"\n   🚨 ELEMENTS MISSING ARIA LABELS:")
                for i, element_info in enumerate(missing_elements, 1):
                    print(f"     {i}. [{element_info['type']}] {element_info['context']}")
        
        # Add to overall totals
        total_elements_all_files += total
        total_without_aria_all_files += without_aria
        all_missing_elements.extend([(filename, elem) for elem in missing_elements])
        
        # Add to results
        for element_info in missing_elements:
            results["missing_aria_elements"].append({
                "filename": filename,
                "file_path": html_file,
                "element_type": element_info["type"],
                "element_html": element_info["html"],
                "context": element_info["context"]
            })
        
        # Combine element type counts
        for element_type, count in missing_by_type.items():
            overall_missing_by_type[element_type] = overall_missing_by_type.get(element_type, 0) + count
        
        results["files"].append(file_result)
    
    # Generate summary
    overall_percentage = (total_without_aria_all_files / total_elements_all_files * 100) if total_elements_all_files > 0 else 0
    
    results["summary"] = {
        "total_files_analyzed": len(html_files),
        "total_files_with_issues": len([f for f in results["files"] if f["elements_without_aria"] > 0]),
        "total_interactive_elements": total_elements_all_files,
        "total_elements_without_aria": total_without_aria_all_files,
        "overall_percentage_without_aria": round(overall_percentage, 1),
        "missing_by_element_type": overall_missing_by_type
    }
    
    if output_json:
        # Save to JSON file
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"✅ ARIA analysis results saved to {json_filename}")
        return results
    else:
        # Display summary
        if total_elements_all_files > 0:
            print(f"\n🎯 OVERALL RESULTS")
            print(f"   Total elements across all files: {total_elements_all_files}")
            print(f"   Elements without aria labels: {total_without_aria_all_files}")
            print(f"   Overall percentage without aria: {overall_percentage:.1f}%")
            
            # Show overall breakdown by element type
            if overall_missing_by_type:
                print(f"\n🔍 ELEMENTS MISSING ARIA LABELS BY TYPE:")
                for element_type, count in sorted(overall_missing_by_type.items()):
                    print(f"   - {count} {element_type}(s)")
                
                print(f"\n📊 DETAILED BREAKDOWN:")
                for element_type, count in sorted(overall_missing_by_type.items()):
                    percentage_of_missing = (count / total_without_aria_all_files) * 100
                    print(f"   - {element_type}: {count} ({percentage_of_missing:.1f}% of all missing aria labels)")
            
            # Show all missing elements across all files
            if all_missing_elements:
                print(f"\n🚨 ALL ELEMENTS MISSING ARIA LABELS:")
                print("=" * 60)
                for i, (filename, element_info) in enumerate(all_missing_elements, 1):
                    print(f"{i:2d}. [{element_info['type']}] in {filename}")
                    print(f"    {element_info['context']}")
                    print()
        
        return results

# Analyzing Images for Alt Tags
class ImageAltAnalyzer:
    def __init__(self):
        self.total_images = 0
        self.images_without_alt = 0
        self.file_results = []

    def analyze_html_content(self, content, filename):
        """Analyze HTML content for img tags and their alt attributes"""
        try:
            soup = BeautifulSoup(content, 'html.parser')
            img_tags = soup.find_all('img')
            
            file_total = len(img_tags)
            file_without_alt = 0
            missing_alt_tags = []
            
            for img in img_tags:
                alt_attr = img.get('alt')
                # Consider empty alt="" as having alt (valid for decorative images)
                # Only count as missing if alt attribute is completely absent
                if alt_attr is None:
                    file_without_alt += 1
                    # Store the actual img tag as string
                    missing_alt_tags.append(str(img))
            
            self.total_images += file_total
            self.images_without_alt += file_without_alt
            
            self.file_results.append({
                'filename': filename,
                'total_images': file_total,
                'without_alt': file_without_alt,
                'percentage': (file_without_alt / file_total * 100) if file_total > 0 else 0,
                'missing_alt_tags': missing_alt_tags,
                'file_type': 'html'
            })
            
        except Exception as e:
            print(f"Error parsing {filename}: {e}")

    def analyze_js_content(self, content, filename):
        """Analyze JavaScript content for dynamically created img elements"""
        # Look for patterns like: createElement('img'), new Image(), innerHTML with <img>
        patterns = [
            (r'createElement\s*\(\s*[\'"]img[\'"]\s*\)', 'createElement'),
            (r'new\s+Image\s*\(\s*\)', 'new Image'),
            (r'innerHTML\s*[+]?=\s*[\'"]([^\'\"]*<img[^>]*>)[^\'\"]*[\'"]', 'innerHTML'),
            (r'insertAdjacentHTML\s*\([^)]*[\'"]([^\'\"]*<img[^>]*>)[^\'\"]*[\'"]\)', 'insertAdjacentHTML'),
        ]
        
        js_images = 0
        js_without_alt = 0
        missing_alt_tags = []
        
        for pattern, pattern_type in patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                js_images += 1
                
                if pattern_type in ['innerHTML', 'insertAdjacentHTML']:
                    # Extract the img tag from the captured group
                    img_html = match.group(1) if match.groups() else match.group()
                    if 'alt=' not in img_html.lower():
                        js_without_alt += 1
                        missing_alt_tags.append({
                            'type': pattern_type,
                            'img_tag': img_html.strip(),
                            'full_match': match.group().strip()
                        })
                else:
                    # createElement and new Image() don't automatically have alt
                    js_without_alt += 1
                    missing_alt_tags.append({
                        'type': pattern_type,
                        'img_tag': f"Dynamic image creation: {pattern_type}",
                        'full_match': match.group().strip()
                    })
        
        if js_images > 0:
            self.total_images += js_images
            self.images_without_alt += js_without_alt
            
            self.file_results.append({
                'filename': filename,
                'total_images': js_images,
                'without_alt': js_without_alt,
                'percentage': (js_without_alt / js_images * 100) if js_images > 0 else 0,
                'missing_alt_tags': missing_alt_tags,
                'file_type': 'javascript'
            })

    def analyze_directory(self, directory_path, recursive=True):
        """Analyze all HTML, JS, and CSS files in a directory"""
        directory = Path(directory_path)
        
        if not directory.exists():
            print(f"Directory {directory_path} does not exist.")
            return
        
        # File extensions to analyze
        extensions = {'.html', '.htm', '.js', '.jsx', '.ts', '.tsx'}
        
        if recursive:
            files = [f for f in directory.rglob('*') if f.suffix.lower() in extensions]
        else:
            files = [f for f in directory.iterdir() if f.is_file() and f.suffix.lower() in extensions]
        
        if not files:
            print(f"No HTML/JS files found in {directory_path}")
            return
        
        print(f"Analyzing {len(files)} files...")
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if file_path.suffix.lower() in {'.html', '.htm'}:
                    self.analyze_html_content(content, file_path.name)
                elif file_path.suffix.lower() in {'.js', '.jsx', '.ts', '.tsx'}:
                    self.analyze_js_content(content, file_path.name)
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    def analyze_files(self, file_paths):
        """Analyze specific files"""
        for file_path in file_paths:
            path = Path(file_path)
            if not path.exists():
                print(f"File {file_path} does not exist.")
                continue
                
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if path.suffix.lower() in {'.html', '.htm'}:
                    self.analyze_html_content(content, path.name)
                elif path.suffix.lower() in {'.js', '.jsx', '.ts', '.tsx'}:
                    self.analyze_js_content(content, path.name)
                else:
                    print(f"Unsupported file type: {path.suffix}")
                    
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    def get_results_dict(self):
        """Get results as a dictionary for JSON export"""
        overall_percentage = (self.images_without_alt / self.total_images * 100) if self.total_images > 0 else 0
        
        return {
            "analysis_timestamp": datetime.now().isoformat(),
            "summary": {
                "total_images": self.total_images,
                "images_without_alt": self.images_without_alt,
                "percentage_without_alt": round(overall_percentage, 2)
            },
            "file_details": [
                {
                    "filename": result['filename'],
                    "file_type": result.get('file_type', 'unknown'),
                    "total_images": result['total_images'],
                    "images_without_alt": result['without_alt'],
                    "percentage_without_alt": round(result['percentage'], 2),
                    "missing_alt_tags": result.get('missing_alt_tags', [])
                }
                for result in self.file_results
            ],
            "all_missing_tags": [
                {
                    "filename": result['filename'],
                    "file_type": result.get('file_type', 'unknown'),
                    "tags": result.get('missing_alt_tags', [])
                }
                for result in self.file_results
                if result.get('missing_alt_tags')
            ],
            "notes": [
                "Empty alt='' attributes are considered valid (for decorative images)",
                "Only completely missing alt attributes are counted as violations",
                "For JavaScript files, dynamic image creation patterns are detected",
                "Image tags show the actual HTML found in the files"
            ]
        }

    def save_to_json(self, output_file):
        """Save results to JSON file"""
        results = self.get_results_dict()
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"Results saved to {output_file}")
        except Exception as e:
            print(f"Error saving to JSON file: {e}")

    def print_results(self, detailed=False):
        """Print analysis results"""
        print("\n" + "="*60)
        print("IMAGE ALT TAG ANALYSIS RESULTS")
        print("="*60)
        
        if detailed and self.file_results:
            print("\nPer-file results:")
            print("-" * 60)
            for result in self.file_results:
                if result['total_images'] > 0:
                    print(f"{result['filename']:<30} | "
                          f"Total: {result['total_images']:>3} | "
                          f"Missing alt: {result['without_alt']:>3} | "
                          f"Percentage: {result['percentage']:>6.1f}%")
                    
                    # Show missing alt tags if detailed view is requested
                    missing_tags = result.get('missing_alt_tags', [])
                    if missing_tags:
                        print(f"  Missing alt tags:")
                        for i, tag in enumerate(missing_tags, 1):
                            if isinstance(tag, dict):  # JavaScript tags
                                print(f"    {i}. [{tag['type']}] {tag['img_tag']}")
                            else:  # HTML tags
                                print(f"    {i}. {tag}")
                        print()
        
        print(f"\nOVERALL SUMMARY:")
        print(f"Total images found: {self.total_images}")
        print(f"Images without alt tags: {self.images_without_alt}")
        
        if self.total_images > 0:
            percentage = (self.images_without_alt / self.total_images) * 100
            print(f"Percentage without alt tags: {percentage:.2f}%")
        else:
            print("No images found to analyze.")
        
        print("\nNote: Empty alt='' attributes are considered valid (for decorative images)")
        print("Only completely missing alt attributes are counted as violations.")

def main():
    parser = argparse.ArgumentParser(description='Analyze HTML/JS files for images without alt tags')
    parser.add_argument('path', nargs='?', default='.', 
                       help='Directory or file path to analyze (default: current directory)')
    parser.add_argument('--files', nargs='+', 
                       help='Specific files to analyze')
    parser.add_argument('--no-recursive', action='store_true',
                       help='Don\'t analyze subdirectories recursively')
    parser.add_argument('--detailed', action='store_true',
                       help='Show per-file breakdown')
    parser.add_argument('--json', metavar='OUTPUT_FILE',
                       help='Save results to JSON file (e.g., --json results.json)')
    parser.add_argument('--json-only', metavar='OUTPUT_FILE',
                       help='Save to JSON and suppress console output')
    
    args = parser.parse_args()
    
    analyzer = ImageAltAnalyzer()
    
    if args.files:
        analyzer.analyze_files(args.files)
    else:
        analyzer.analyze_directory(args.path, recursive=not args.no_recursive)
    
    # Generate automatic JSON filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    auto_json_filename = f"img_alt_analysis.json"
    
    # Handle JSON output
    if args.json_only:
        analyzer.save_to_json(args.json_only)
    elif args.json:
        analyzer.print_results(detailed=args.detailed)
        analyzer.save_to_json(args.json)
    else:
        # Always show console output and save to automatic JSON file
        analyzer.print_results(detailed=args.detailed)
        analyzer.save_to_json(auto_json_filename)

# Test for Nesting
def check_html_nesting(file_path):
    """
    Check for improper HTML nesting issues
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    lines = html_content.split('\n')
    issues = []
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Check for common improper nesting scenarios
        improper_nesting_rules = [
            # Block elements inside inline elements
            {'parent': 'a', 'invalid_children': ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']},
            {'parent': 'span', 'invalid_children': ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']},
            {'parent': 'em', 'invalid_children': ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']},
            {'parent': 'strong', 'invalid_children': ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']},
            
            # P tags cannot contain block elements
            {'parent': 'p', 'invalid_children': ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'form']},
            
            # Table structure violations
            {'parent': 'table', 'invalid_children': ['div', 'p', 'span'], 'valid_children': ['thead', 'tbody', 'tfoot', 'tr', 'caption', 'colgroup']},
            {'parent': 'tr', 'invalid_children': ['div', 'p', 'span'], 'valid_children': ['td', 'th']},
            
            # List structure violations
            {'parent': 'ul', 'invalid_children': ['div', 'p', 'span'], 'valid_children': ['li']},
            {'parent': 'ol', 'invalid_children': ['div', 'p', 'span'], 'valid_children': ['li']},
            
            # Form nesting issues
            {'parent': 'form', 'invalid_children': ['form']},  # Nested forms
            {'parent': 'button', 'invalid_children': ['button', 'input', 'select', 'textarea', 'a']},
        ]
        
        for rule in improper_nesting_rules:
            parent_tag = rule['parent']
            invalid_children = rule.get('invalid_children', [])
            valid_children = rule.get('valid_children', None)
            
            parent_elements = soup.find_all(parent_tag)
            
            for parent in parent_elements:
                # Check for invalid children
                for child in parent.find_all(recursive=False):  # Direct children only
                    if child.name in invalid_children:
                        line_num = find_element_line_number(html_content, str(child))
                        issues.append({
                            'type': 'HTML_IMPROPER_NESTING',
                            'line': line_num,
                            'message': f"Invalid nesting: <{child.name}> inside <{parent_tag}>",
                            'code': lines[line_num-1].strip() if line_num <= len(lines) else str(child)
                        })
                
                # Check if only valid children are allowed
                if valid_children:
                    for child in parent.find_all(recursive=False):
                        if child.name and child.name not in valid_children:
                            line_num = find_element_line_number(html_content, str(child))
                            issues.append({
                                'type': 'HTML_IMPROPER_NESTING',
                                'line': line_num,
                                'message': f"Invalid child: <{child.name}> inside <{parent_tag}> (only {valid_children} allowed)",
                                'code': lines[line_num-1].strip() if line_num <= len(lines) else str(child)
                            })
    
    except Exception as e:
        issues.append({
            'type': 'HTML_PARSE_ERROR',
            'line': 1,
            'message': f"HTML parsing error: {str(e)}",
            'code': 'Unable to parse HTML'
        })
    
    return issues

def check_css_nesting(file_path):
    """
    Check for improper CSS nesting issues
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        css_content = f.read()
    
    lines = css_content.split('\n')
    issues = []
    
    brace_stack = []
    in_media_query = False
    
    for line_num, line in enumerate(lines, 1):
        stripped_line = line.strip()
        
        # Track opening braces
        open_braces = stripped_line.count('{')
        close_braces = stripped_line.count('}')
        
        # Check for media query nesting
        if '@media' in stripped_line and '{' in stripped_line:
            in_media_query = True
            brace_stack.append('media')
        
        # Check for nested selectors (invalid in standard CSS)
        if open_braces > 0 and not stripped_line.startswith('@') and brace_stack:
            # Check if we're already inside a selector
            if any(item != 'media' for item in brace_stack):
                issues.append({
                    'type': 'CSS_NESTED_SELECTORS',
                    'line': line_num,
                    'message': 'Nested selectors detected (invalid in standard CSS)',
                    'code': stripped_line
                })
        
        # Track braces for nesting level
        for _ in range(open_braces):
            brace_stack.append('selector')
        
        for _ in range(close_braces):
            if brace_stack:
                closed_item = brace_stack.pop()
                if closed_item == 'media':
                    in_media_query = False
        
        # Check for unclosed braces at end
        if line_num == len(lines) and brace_stack:
            issues.append({
                'type': 'CSS_UNCLOSED_BRACES',
                'line': line_num,
                'message': f'Unclosed braces detected: {len(brace_stack)} remaining',
                'code': 'End of file'
            })
    
    return issues

def check_js_nesting(file_path):
    """
    Check for improper JavaScript nesting issues
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    lines = js_content.split('\n')
    issues = []
    
    # Track nesting levels
    brace_stack = []
    paren_stack = []
    bracket_stack = []
    
    for line_num, line in enumerate(lines, 1):
        stripped_line = line.strip()
        
        # Skip comments
        if stripped_line.startswith('//') or stripped_line.startswith('/*'):
            continue
        
        # Track brackets, braces, and parentheses
        for char in stripped_line:
            if char == '{':
                brace_stack.append(line_num)
            elif char == '}':
                if brace_stack:
                    brace_stack.pop()
                else:
                    issues.append({
                        'type': 'JS_UNMATCHED_BRACE',
                        'line': line_num,
                        'message': 'Closing brace without matching opening brace',
                        'code': stripped_line
                    })
            elif char == '(':
                paren_stack.append(line_num)
            elif char == ')':
                if paren_stack:
                    paren_stack.pop()
                else:
                    issues.append({
                        'type': 'JS_UNMATCHED_PAREN',
                        'line': line_num,
                        'message': 'Closing parenthesis without matching opening parenthesis',
                        'code': stripped_line
                    })
            elif char == '[':
                bracket_stack.append(line_num)
            elif char == ']':
                if bracket_stack:
                    bracket_stack.pop()
                else:
                    issues.append({
                        'type': 'JS_UNMATCHED_BRACKET',
                        'line': line_num,
                        'message': 'Closing bracket without matching opening bracket',
                        'code': stripped_line
                    })
        
        # Check for excessive nesting (more than 5 levels deep)
        total_nesting = len(brace_stack) + len(paren_stack) + len(bracket_stack)
        if total_nesting > 5:
            issues.append({
                'type': 'JS_EXCESSIVE_NESTING',
                'line': line_num,
                'message': f'Excessive nesting detected: {total_nesting} levels deep',
                'code': stripped_line
            })
    
    # Check for unclosed brackets at end of file
    if brace_stack:
        issues.append({
            'type': 'JS_UNCLOSED_BRACE',
            'line': brace_stack[0],
            'message': f'Unclosed braces detected: {len(brace_stack)} remaining',
            'code': f'Starting at line {brace_stack[0]}'
        })
    
    if paren_stack:
        issues.append({
            'type': 'JS_UNCLOSED_PAREN',
            'line': paren_stack[0],
            'message': f'Unclosed parentheses detected: {len(paren_stack)} remaining',
            'code': f'Starting at line {paren_stack[0]}'
        })
    
    if bracket_stack:
        issues.append({
            'type': 'JS_UNCLOSED_BRACKET',
            'line': bracket_stack[0],
            'message': f'Unclosed brackets detected: {len(bracket_stack)} remaining',
            'code': f'Starting at line {bracket_stack[0]}'
        })
    
    return issues

def find_element_line_number(html_content, element_html):
    """
    Find the line number where an HTML element appears
    """
    lines = html_content.split('\n')
    element_clean = ' '.join(element_html.split())
    
    for i, line in enumerate(lines):
        line_clean = ' '.join(line.split())
        if element_clean in line_clean:
            return i + 1
    
    return 1  # Fallback

def analyze_nesting_issues(directory_path=".", output_json=True, json_filename="nesting_issues.json"):
    """
    Analyze all HTML, CSS, and JS files for nesting issues
    """
    import json
    from datetime import datetime
    
    file_patterns = ["*.html", "*.css", "*.js"]
    all_issues = []
    results = {
        "analysis_date": datetime.now().isoformat(),
        "directory": directory_path,
        "summary": {},
        "files": [],
        "issues": []
    }
    
    if not output_json:
        print("🔍 NESTING ANALYSIS RESULTS")
        print("=" * 60)
    
    for pattern in file_patterns:
        files = glob.glob(os.path.join(directory_path, pattern))
        
        for file_path in files:
            filename = os.path.basename(file_path)
            file_extension = os.path.splitext(filename)[1].lower()
            
            file_result = {
                "filename": filename,
                "file_path": file_path,
                "file_type": file_extension,
                "issues_count": 0,
                "issues": []
            }
            
            if not output_json:
                print(f"\n📄 Analyzing {filename}")
                print("-" * 40)
            
            issues = []
            
            try:
                if file_extension == '.html':
                    issues = check_html_nesting(file_path)
                elif file_extension == '.css':
                    issues = check_css_nesting(file_path)
                elif file_extension == '.js':
                    issues = check_js_nesting(file_path)
                
                file_result["issues_count"] = len(issues)
                file_result["issues"] = issues
                
                if issues:
                    if not output_json:
                        print(f"   ❌ Found {len(issues)} nesting issues:")
                        for i, issue in enumerate(issues, 1):
                            print(f"      {i}. Line {issue['line']}: {issue['message']}")
                            print(f"         Code: {issue['code']}")
                            print()
                    
                    all_issues.extend([(filename, issue) for issue in issues])
                    
                    # Add to results
                    for issue in issues:
                        results["issues"].append({
                            "filename": filename,
                            "file_path": file_path,
                            "line": issue["line"],
                            "type": issue["type"],
                            "message": issue["message"],
                            "code": issue["code"]
                        })
                else:
                    if not output_json:
                        print("   ✅ No nesting issues found")
                    
            except Exception as e:
                error_msg = f"Error analyzing file: {str(e)}"
                if not output_json:
                    print(f"   ⚠️  {error_msg}")
                
                file_result["error"] = error_msg
            
            results["files"].append(file_result)
    
    # Generate summary
    issue_types = {}
    for filename, issue in all_issues:
        issue_type = issue['type']
        if issue_type not in issue_types:
            issue_types[issue_type] = []
        issue_types[issue_type].append((filename, issue))
    
    results["summary"] = {
        "total_files_analyzed": len(results["files"]),
        "total_files_with_issues": len(set(issue[0] for issue in all_issues)),
        "total_issues_found": len(all_issues),
        "issues_by_type": {issue_type: len(issues) for issue_type, issues in issue_types.items()}
    }
    
    if output_json:
        # Save to JSON file
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"✅ Results saved to {json_filename}")
        return results
    else:
        # Display summary
        if all_issues:
            print(f"\n📊 SUMMARY")
            print("=" * 60)
            print(f"Total files with issues: {len(set(issue[0] for issue in all_issues))}")
            print(f"Total nesting issues found: {len(all_issues)}")
            
            print(f"\nIssues by type:")
            for issue_type, issues in issue_types.items():
                print(f"  - {issue_type}: {len(issues)}")
        else:
            print(f"\n✅ No nesting issues found in any files!")
        
        return results


# Example usage
if __name__ == "__main__":
    # Option 1: Analyze single file
    # percentage, without_aria, total, missing_by_type = check_aria_labels("your_file.html")
    # print(f"Percentage without aria labels: {percentage:.1f}%")
    # if missing_by_type:
    #     print("Missing by type:", missing_by_type)
    
    # Option 2: Analyze all HTML files in a directory
    # test for Aria
    analyze_directory(".")  # Current directory
    
    # test for alt tags
    main()

    # test for nested structure
    analyze_nesting_issues(".")

    # Option 3: Analyze specific directory
    # analyze_directory("/path/to/your/html/files")