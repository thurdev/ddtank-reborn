-- VIEW dbo.Ddt_User_Quest_Veiw (modified 2011-04-13T00:53:18.810)

CREATE VIEW [dbo].[Ddt_User_Quest_Veiw]
AS
SELECT     CAST(0 AS Int) AS UserID, CAST(0 AS Int) AS QuestID, CAST(0 AS Int) AS ConditionCount, CAST('' AS Varchar(20)) AS Complete, 
                      CAST('1999-01-01' AS DateTime) AS CompletedDate, CAST('' AS Varchar(10)) AS Exist, CAST(0 AS Int) AS [Level], CAST('' AS Varchar(100)) AS Title, 
                      CAST('' AS Varchar(1000)) AS Detail, CAST('' AS Varchar(100)) AS Objective, CAST(0 AS Int) AS Condition, CAST('1999-01-01' AS DateTime) AS StartDate, 
                      CAST('1999-01-01' AS DateTime) AS AsEndDate




GO
