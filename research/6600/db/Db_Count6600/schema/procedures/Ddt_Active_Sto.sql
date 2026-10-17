-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Sto (modified 2012-04-21T07:53:24.983)
CREATE  PROCEDURE   [dbo].[Ddt_Active_Sto]  

 @Title nvarchar(400), 
 @Description nvarchar(4000), 
 @Content nvarchar(4000), 
 @AwardContent nvarchar(4000), 
 @HasKey int, 
 @StartDate DateTime, 
 @EndDate DateTime, 
 @IsOnly bit, 
 @Type int,  
 @ActionTimeContent nvarchar(100),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 declare @maxid int

 if( @op='Insert') 
   begin                
     Select  top 1  @maxid=Isnull(max(activeid),0)+1 from Db_Tank.Dbo.Active with(nolock)      
     INSERT INTO Db_Tank.Dbo.Active(ActiveID, Title, Description, Content, AwardContent, HasKey, StartDate, EndDate, IsOnly, Type, ActionTimeContent) 
            VALUES(@maxid, @Title, @Description, @Content, @AwardContent, @HasKey, @StartDate, @EndDate, @IsOnly, @Type, @ActionTimeContent)     
     set @ouototal=@maxid
 end 
   
 if( @op!='Insert')
   begin 
     UPDATE Db_Tank.Dbo.Active Set  Title=@Title, Description=@Description, Content=@Content, AwardContent=@AwardContent, HasKey=@HasKey, StartDate=@StartDate, EndDate=@EndDate, IsOnly=@IsOnly, Type=@Type, ActionTimeContent=@ActionTimeContent WHERE (Activeid =@op)
     set @ouototal=@op   	
   end
GO
