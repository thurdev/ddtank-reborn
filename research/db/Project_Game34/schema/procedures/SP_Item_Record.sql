-- SQL_STORED_PROCEDURE dbo.SP_Item_Record (modified 2021-06-04T01:29:18.280)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<铁匠铺：记录强化、合成、熔炼结果>
-- =============================================
CREATE Procedure [dbo].[SP_Item_Record]
@AgentsID int,
@ServerID int,
@Timer  datetime,
@UserID int,
@UserName nvarchar(50),
@Operation int ,
@ItemName nvarchar(50),
@ItemID int ,
@BeginProperty nvarchar(200),
@EndProperty  nvarchar(200),
@Result int 

as

begin

insert into Item_Record  (AgentsID, ServerID, Timer,UserID,UserName,Operation,ItemName, ItemID,BeginProperty,EndProperty ,Result)
 values(   @AgentsID, @ServerID, @Timer,@UserID,@UserName,@Operation,@ItemName, @ItemID,@BeginProperty,@EndProperty ,@Result )

end










GO
