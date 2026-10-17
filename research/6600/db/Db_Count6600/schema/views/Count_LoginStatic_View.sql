-- VIEW dbo.Count_LoginStatic_View (modified 2011-04-13T00:53:16.590)
CREATE VIEW [dbo].[Count_LoginStatic_View]
AS
SELECT Cast(0 As Int) AS LoginUser_All, Cast(0 As Int) AS LoginUser_One, CAST('1.000' AS numeric(10, 2)) 
      AS LoginUser_Ave, Cast(1 As Int) AS LoginMan_All, Cast(0 As Int) AS LoginMan_One, 
      CAST('1.000' AS numeric(10, 2)) AS LoginMan_Ave,Cast(0 As Int) AS LoginWorman_All, 
     Cast(0 As Int) AS LoginWorman_One, CAST('1.000' AS numeric(10, 2)) AS LoginWorman_Ave



GO
